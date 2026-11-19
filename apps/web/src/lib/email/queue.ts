import "server-only";

import { parseSettings, type Settings } from "@helpwren/core";
import { z } from "zod";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { replyAddressFor, threadHeaders } from "./inbound";
import { sendEmail, type EmailMessage, type SendEmailResult } from "./index";
import { renderEmail } from "./template";

/** How many emails one run takes on, and how often one is tried before it is given up on. */
const BATCH = 50;
const MAX_ATTEMPTS = 3;
/** The most replies quoted in one email; a longer backlog is better read in the chat. */
const MAX_QUOTES = 5;

const statusNames = { open: "Open", pending: "Waiting", resolved: "Resolved", closed: "Closed" };

const conversationSchema = z.object({
  id: z.uuid(),
  type: z.enum(["chat", "ticket"]),
  ticket_number: z.number().nullable(),
  subject: z.string().nullable(),
  context: z.record(z.string(), z.unknown()),
  contact_id: z.uuid(),
  unread_for_contact: z.number(),
  contact: z.object({ name: z.string().nullable(), email: z.string().nullable() }),
});
type Conversation = z.infer<typeof conversationSchema>;

const statusEventSchema = z.object({
  data: z.object({ to: z.enum(["open", "pending", "resolved", "closed"]) }),
});

export interface QueueRun {
  sent: number;
  skipped: number;
  failed: number;
}

type Outcome = "sent" | "skipped" | "failed" | "retry";
type Send = (message: EmailMessage) => Promise<SendEmailResult>;

/** Where the contact goes to carry on: the page they wrote from, or the chat page. */
function returnAddress(conversation: Conversation): string {
  const from = conversation.context.url;
  if (typeof from === "string" && /^https?:\/\//.test(from)) return from;
  return new URL("/chat", env.NEXT_PUBLIC_APP_URL).href;
}

/** A ticket is named by its number and subject, the way the contact will have seen it. */
function ticketName(conversation: Conversation): string {
  const number = conversation.ticket_number === null ? "" : `#${conversation.ticket_number}`;
  return [number, conversation.subject].filter(Boolean).join(" ");
}

/** The agents' replies the contact has not read, oldest first, with who wrote each. */
async function unreadReplies(conversation: Conversation) {
  const { data: messages, error } = await supabaseAdmin
    .from("messages")
    .select("sender_id, body, attachments, created_at")
    .eq("conversation_id", conversation.id)
    .eq("sender_role", "agent")
    .order("created_at", { ascending: false })
    .limit(Math.min(conversation.unread_for_contact, MAX_QUOTES));
  if (error) throw error;

  const { data: agents, error: agentsError } = await supabaseAdmin
    .from("agents")
    .select("user_id, name")
    .in("user_id", [...new Set(messages.map((message) => message.sender_id))]);
  if (agentsError) throw agentsError;

  return messages.reverse().map((message) => ({
    from: agents.find((agent) => agent.user_id === message.sender_id)?.name ?? "The team",
    // A reply that is only a file has no words to quote.
    text: message.body ?? "Sent you a file. Open the conversation to see it.",
  }));
}

/** Said in every email that can be answered by replying to it. */
const REPLY_HINT = "Reply to this email, or continue in the chat.";

/**
 * Who a contact's answer goes to and how mail apps thread it: the signed reply address while
 * replying by email is on, and Message-IDs that put every email about a conversation together.
 */
async function addressing(settings: Settings, conversation: Conversation) {
  const replyTo = await replyAddressFor(
    settings.email.inbound,
    conversation.id,
    conversation.contact_id,
  );
  const domain = (settings.email.inbound.address ?? settings.email.fromAddress)?.split("@")[1];
  return { replyTo, ...(domain ? threadHeaders(conversation.id, domain) : {}) };
}

function replyEmail(
  settings: Settings,
  conversation: Conversation,
  quotes: readonly { from: string; text: string }[],
  answerable: boolean,
): Omit<EmailMessage, "to"> {
  const brand = settings.brand.name;
  const ticket = conversation.type === "ticket" ? ticketName(conversation) : "";
  const count = quotes.length === 1 ? "a new reply" : `${quotes.length} new replies`;
  const { html, text } = renderEmail(settings.brand, {
    preview: quotes.at(-1)?.text ?? "",
    heading: `You have ${count} from ${brand}`,
    body: [
      ticket ? `About your ticket ${ticket}.` : "Here is what was said while you were away.",
      ...(answerable ? [REPLY_HINT] : []),
    ],
    quotes,
    action: { label: "Continue the conversation", url: returnAddress(conversation) },
    footer: `You are getting this because you wrote to ${brand} and have not read the reply yet.`,
  });
  return { subject: ticket ? `Re: ${ticket}` : `New reply from ${brand}`, html, text };
}

function statusEmail(
  settings: Settings,
  conversation: Conversation,
  to: keyof typeof statusNames,
  answerable: boolean,
): Omit<EmailMessage, "to"> {
  const brand = settings.brand.name;
  const ticket = ticketName(conversation);
  const done = to === "resolved" || to === "closed";
  const { html, text } = renderEmail(settings.brand, {
    preview: `Your ticket is now ${statusNames[to].toLowerCase()}.`,
    heading: `Your ticket is now ${statusNames[to].toLowerCase()}`,
    body: [
      `${brand} changed the status of your ticket ${ticket}.`,
      done
        ? "If it is not sorted, write back in the conversation and it will open again."
        : "You can add to it in the conversation at any time.",
      ...(answerable ? [REPLY_HINT] : []),
    ],
    action: { label: "Open the conversation", url: returnAddress(conversation) },
    footer: `You are getting this because you opened a ticket with ${brand}.`,
  });
  return { subject: `${ticket}: ${statusNames[to]}`, html, text };
}

/** What sending came to, as what to do with the queue entries behind it. */
function outcomeOf(result: SendEmailResult): Outcome {
  if (result.ok) return "sent";
  // With no provider or no from address there is no sending at all; trying again changes nothing.
  if (result.reason === "not_configured") return "skipped";
  // A refusal is about this email and will be refused again. A failure to reach the provider
  // may pass.
  return result.reason === "rejected" ? "failed" : "retry";
}

/**
 * Sends the emails that are due: replies a contact has still not read, and changes to a
 * ticket's status. Run it every minute or so. `send` is for tests.
 */
export async function processEmailQueue(send: Send = sendEmail): Promise<QueueRun> {
  const run: QueueRun = { sent: 0, skipped: 0, failed: 0 };
  const claimed = await supabaseAdmin.rpc("claim_email_queue", { batch: BATCH });
  if (claimed.error) throw claimed.error;
  const jobs = claimed.data;
  if (jobs.length === 0) return run;

  async function finish(ids: readonly string[], outcome: Outcome) {
    if (ids.length === 0) return;
    const affected = jobs.filter((job) => ids.includes(job.id));
    // Out of tries: given up on. Otherwise let go of, for the next run to pick up.
    const retry = outcome === "retry" && affected.every((job) => job.attempts < MAX_ATTEMPTS);
    const final = outcome === "retry" ? "failed" : outcome;
    const { error } = await supabaseAdmin
      .from("email_queue")
      .update(retry ? { claimed_at: null } : { done_at: new Date().toISOString(), outcome: final })
      .in("id", [...ids]);
    if (error) throw error;
    if (!retry) run[final] += ids.length;
  }

  const [settingRows, conversationRows] = await Promise.all([
    supabaseAdmin.from("settings").select("key, value"),
    supabaseAdmin
      .from("conversations")
      .select(
        "id, type, ticket_number, subject, context, contact_id, unread_for_contact, contact:contacts!inner(name, email)",
      )
      .in("id", [...new Set(jobs.map((job) => job.conversation_id))]),
  ]);
  if (settingRows.error) throw settingRows.error;
  if (conversationRows.error) throw conversationRows.error;
  const settings = parseSettings(settingRows.data);
  const conversations = z.array(conversationSchema).parse(conversationRows.data);

  for (const conversation of conversations) {
    const mine = jobs.filter((job) => job.conversation_id === conversation.id);
    const replies = mine.filter((job) => job.kind === "reply").map((job) => job.id);
    const statuses = mine.filter((job) => job.kind === "status");
    const to = conversation.contact.email;

    // One email covers every reply that is waiting, however many were queued.
    if (!to || !settings.email.replies || conversation.unread_for_contact === 0) {
      await finish(replies, "skipped");
    } else if (replies.length > 0) {
      const headers = await addressing(settings, conversation);
      const quotes = await unreadReplies(conversation);
      const email = replyEmail(settings, conversation, quotes, headers.replyTo !== undefined);
      await finish(replies, outcomeOf(await send({ to, ...email, ...headers })));
    }

    // Only where the ticket stands now is news; a change that was changed again is not.
    const latest = statuses.at(-1);
    const earlier = statuses.slice(0, -1).map((job) => job.id);
    await finish(earlier, "skipped");
    if (!latest) continue;
    if (!to || !settings.email.status || !latest.event_id) {
      await finish([latest.id], "skipped");
      continue;
    }
    const event = await supabaseAdmin
      .from("conversation_events")
      .select("data")
      .eq("id", latest.event_id)
      .single();
    if (event.error) throw event.error;
    const headers = await addressing(settings, conversation);
    const status = statusEventSchema.parse(event.data).data.to;
    const email = statusEmail(settings, conversation, status, headers.replyTo !== undefined);
    await finish([latest.id], outcomeOf(await send({ to, ...email, ...headers })));
  }

  return run;
}

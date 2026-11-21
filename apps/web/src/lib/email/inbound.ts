import "server-only";

import { randomBytes } from "node:crypto";

import {
  createGenericInbound,
  createPostmarkInbound,
  createResendInbound,
  type InboundEmail,
  type InboundEmailAdapter,
} from "@helpwren/adapters";
import {
  ATTACHMENTS_MAX,
  parseSettings,
  type Attachment,
  type InboundEmailSettings,
  type InboundProvider,
} from "@helpwren/core";
import { z } from "zod";

import { storeAttachment } from "@/lib/api/store-attachment";
import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import {
  checkReplyToken,
  findReplyToken,
  readReplyToken,
  replyAddress,
  signReplyToken,
  type ReplyKey,
} from "./reply-address";
import { getSavedEmail } from "./saved-email";
import { replyText } from "./strip-reply";

/** The keys that sign reply addresses, made the first time one is needed. */
export const REPLY_KEYS_SECRET = "email_reply_keys";
/** The secret Postmark's basic auth and the generic adapter's signature are checked against. */
export const INBOUND_SECRET = "inbound_email_secret";
/** Resend's webhook signing secret and, optionally, an API key that may read received mail. */
export const RESEND_INBOUND_SECRET = "resend_inbound";

/** A message holds at most this many characters; the database agrees. */
const BODY_MAX = 5000;

const replyKeysSchema = z.array(
  z.object({ version: z.number().int().min(1).max(255), secret: z.string().min(32) }),
);
const resendInboundSchema = z.object({
  signingSecret: z.string().min(1),
  apiKey: z.string().min(1).optional(),
});

async function stored(key: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from("secrets")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
}

async function keepSecret(key: string, value: unknown): Promise<void> {
  const { error } = await supabaseAdmin.from("secrets").upsert({ key, value: value as never });
  if (error) throw error;
}

/**
 * The keys that sign reply addresses, newest first. The first is made on first use; two
 * servers doing so at once both end up with whichever was saved first.
 */
export async function getReplyKeys(): Promise<ReplyKey[]> {
  const keys = replyKeysSchema.safeParse(await stored(REPLY_KEYS_SECRET));
  if (keys.success && keys.data.length > 0) return keys.data;

  const first = [{ version: 1, secret: randomBytes(32).toString("base64url") }];
  const { error } = await supabaseAdmin
    .from("secrets")
    .upsert({ key: REPLY_KEYS_SECRET, value: first }, { ignoreDuplicates: true });
  if (error) throw error;
  return replyKeysSchema.parse(await stored(REPLY_KEYS_SECRET));
}

/**
 * The address a contact's answer to an email about this conversation should go to, or
 * `undefined` while replying by email is off or has no address.
 */
export async function replyAddressFor(
  inbound: InboundEmailSettings,
  conversationId: string,
  contactId: string,
): Promise<string | undefined> {
  if (!inbound.enabled || !inbound.address) return undefined;
  const [key] = await getReplyKeys();
  if (!key) return undefined;
  return replyAddress(inbound.address, signReplyToken(key, conversationId, contactId));
}

/**
 * The Message-IDs that thread a conversation's emails in a mail app: one per email, each
 * pointing back at the same root, which stands for the conversation itself.
 */
export function threadHeaders(conversationId: string, domain: string) {
  const root = `helpwren.${conversationId}@${domain}`;
  return {
    messageId: `helpwren.${conversationId}.${crypto.randomUUID()}@${domain}`,
    inReplyTo: root,
    references: [root],
  };
}

/** Makes a new inbound secret for Postmark or the generic adapter. Shown once. Only for an admin. */
export async function createInboundSecret(): Promise<string> {
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  await keepSecret(INBOUND_SECRET, secret);
  return secret;
}

/** Keeps Resend's signing secret, and an API key when one is given. Only for an admin. */
export async function saveResendInbound(signingSecret: string, apiKey: string): Promise<void> {
  const current = resendInboundSchema.partial().safeParse(await stored(RESEND_INBOUND_SECRET));
  const kept = current.success ? current.data : {};
  await keepSecret(RESEND_INBOUND_SECRET, {
    signingSecret: signingSecret || kept.signingSecret,
    ...(apiKey || kept.apiKey ? { apiKey: apiKey || kept.apiKey } : {}),
  });
}

/** What a settings screen may know about the inbound secrets: whether they are there. */
export interface InboundSummary {
  secret: boolean;
  resendSigningSecret: boolean;
  resendApiKey: boolean;
  /** Whether the server's own `RESEND_API_KEY` can read received mail when none is saved. */
  sendingResendKey: boolean;
  /** When the last reply came in, as an ISO date, to show that the set-up works. */
  lastReceivedAt: string | null;
}

/**
 * The Resend key mail is sent with, from the server or saved in Settings → Email. Received
 * mail can be read with it too, so an install sending through Resend needs no second key.
 */
async function sendingResendKey(): Promise<string | undefined> {
  if (serverEnv.RESEND_API_KEY) return serverEnv.RESEND_API_KEY;
  const saved = await getSavedEmail();
  return saved?.provider === "resend" ? saved.apiKey : undefined;
}

export async function summariseInbound(): Promise<InboundSummary> {
  const [secret, resend, last] = await Promise.all([
    stored(INBOUND_SECRET),
    stored(RESEND_INBOUND_SECRET),
    supabaseAdmin
      .from("inbound_emails")
      .select("received_at")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (last.error) throw last.error;
  const parsed = resendInboundSchema.partial().safeParse(resend);
  return {
    secret: typeof secret === "string",
    resendSigningSecret: parsed.success && Boolean(parsed.data.signingSecret),
    resendApiKey: parsed.success && Boolean(parsed.data.apiKey),
    sendingResendKey: (await sendingResendKey()) !== undefined,
    lastReceivedAt: last.data?.received_at ?? null,
  };
}

/** The adapter for a provider, or `null` when its secrets are not set up. */
export async function getInboundAdapter(
  provider: InboundProvider,
): Promise<InboundEmailAdapter | null> {
  if (provider === "resend") {
    const resend = resendInboundSchema.safeParse(await stored(RESEND_INBOUND_SECRET));
    const apiKey = resend.success ? (resend.data.apiKey ?? (await sendingResendKey())) : undefined;
    if (!resend.success || !apiKey) return null;
    return createResendInbound({ signingSecret: resend.data.signingSecret, apiKey });
  }
  const secret = await stored(INBOUND_SECRET);
  if (typeof secret !== "string") return null;
  return provider === "postmark"
    ? createPostmarkInbound({ secret })
    : createGenericInbound({ secret });
}

/** The install's settings for replies by email. */
export async function getInboundSettings(): Promise<InboundEmailSettings> {
  const { data, error } = await supabaseAdmin.from("settings").select("key, value");
  if (error) throw error;
  return parseSettings(data).email.inbound;
}

/**
 * What became of an email. `ignored` covers everything that must look the same from outside:
 * no reply address, a bad signature, a conversation that does not exist, too many emails.
 */
export type InboundOutcome =
  { outcome: "added" } | { outcome: "duplicate" } | { outcome: "ignored"; reason: string };

const ignored = (reason: string): InboundOutcome => ({ outcome: "ignored", reason });

const conversationSchema = z.object({
  id: z.uuid(),
  contact_id: z.uuid(),
  contact: z.object({ email: z.string().nullable() }),
});

/** Stores what fits of an email's files in the conversation, and says what was left out. */
async function storeAttachments(conversationId: string, email: InboundEmail) {
  const stored: Attachment[] = [];
  const leftOut: string[] = [];
  for (const file of email.attachments.filter((item) => !item.inline)) {
    if (stored.length >= ATTACHMENTS_MAX) {
      leftOut.push(`${file.name} (only ${String(ATTACHMENTS_MAX)} files fit in one message)`);
      continue;
    }
    let result;
    try {
      // Checked by its bytes and stored by the server, as a file sent in the chat is.
      result = await storeAttachment(conversationId, {
        bytes: Uint8Array.from(await file.content()),
        name: file.name,
        type: file.type,
      });
    } catch {
      leftOut.push(`${file.name} (it could not be saved)`);
      continue;
    }
    if (result.ok) stored.push(result.attachment);
    else if (result.reason === "too_large") leftOut.push(`${file.name} (larger than 10 MB)`);
    else if (result.reason === "full")
      leftOut.push(`${file.name} (the conversation holds no more files)`);
    else leftOut.push(`${file.name} (this kind of file cannot be sent)`);
  }
  return { stored, leftOut };
}

function messageBody(words: string, leftOut: readonly string[]): string | null {
  const note = leftOut.length > 0 ? `Not attached: ${leftOut.join(", ")}.` : "";
  const room = BODY_MAX - (note ? note.length + 2 : 0);
  const kept = words.length > room ? `${words.slice(0, room - 1)}…` : words;
  const body = [kept, note].filter(Boolean).join("\n\n");
  return body === "" ? null : body;
}

/**
 * Adds an email to the conversation its reply address names, as the contact who was sent it.
 * The provider's signature must have been checked already. Nothing here says to the outside
 * whether a conversation exists: every refusal is `ignored`, with the reason for the logs.
 */
export async function receiveEmail(
  email: InboundEmail,
  settings: InboundEmailSettings,
): Promise<InboundOutcome> {
  if (!settings.address) return ignored("no reply address is set");
  const token = findReplyToken(email.recipients, settings.address);
  if (!token) return ignored("no reply address among the recipients");
  const read = readReplyToken(token);
  if (!read) return ignored("the reply address is not a token");

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, contact_id, contact:contacts!inner(email)")
    .eq("id", read.conversationId)
    .maybeSingle();
  if (error) throw error;
  const conversation = conversationSchema.safeParse(data);
  // An unknown conversation and a bad signature are the same refusal.
  if (
    !conversation.success ||
    !checkReplyToken(read, conversation.data.contact_id, await getReplyKeys())
  ) {
    return ignored("the reply address's signature does not match");
  }

  const emailId = email.messageId ?? email.providerId;
  if (!emailId) return ignored("the email has no Message-ID");

  // Checked before any file is stored, so a repeat or a stranger costs nothing. The database
  // checks both again when the message is added.
  const seen = await supabaseAdmin
    .from("inbound_emails")
    .select("id")
    .eq("email_id", emailId)
    .maybeSingle();
  if (seen.error) throw seen.error;
  if (seen.data) return { outcome: "duplicate" };
  const contactEmail = conversation.data.contact.email?.toLowerCase();
  const fromContact = contactEmail === email.from.address;

  const words = replyText(email);
  const { stored, leftOut } = fromContact
    ? await storeAttachments(conversation.data.id, email)
    : { stored: [], leftOut: [] };
  const body = messageBody(words, leftOut);
  if (fromContact && body === null && stored.length === 0) {
    return ignored("nothing was left after taking out the quoted email");
  }

  const result = await supabaseAdmin.rpc("receive_email_reply", {
    conversation_id: conversation.data.id,
    sender: email.from.address,
    email_id: emailId,
    body: body ?? "",
    attachments: stored,
  });
  if (result.error) throw result.error;
  switch (result.data) {
    case "added":
      return { outcome: "added" };
    case "duplicate":
      return { outcome: "duplicate" };
    case "wrong_sender":
      return ignored("the sender is not the conversation's contact");
    case "rate_limited":
      return ignored("too many emails from this sender into this conversation");
    case "blocked":
      return ignored("the team has blocked this contact");
    default:
      return ignored("the conversation is gone");
  }
}

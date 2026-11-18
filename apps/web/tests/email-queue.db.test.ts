import { afterAll, describe, expect, it } from "vitest";

import { type EmailMessage, type SendEmailResult } from "@/lib/email";
import { processEmailQueue } from "@/lib/email/queue";
import { supabaseAdmin } from "@/lib/supabase/admin";

// These run against the local database and its demo data, where Sam is an agent.
const SAM = "a0000000-0000-4000-8000-000000000002";
const userIds: string[] = [];

/** A contact with an email address and a conversation they started. */
async function newConversation(email: string, ticketSubject?: string) {
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  userIds.push(created.data.user.id);
  const { data, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: created.data.user.id,
    body: "Where is my order?",
    source: "web",
    context: { url: "https://shop.example/orders" },
    contact_name: "Queue Tester",
    contact_email: email,
    ...(ticketSubject ? { ticket_subject: ticketSubject } : {}),
  });
  if (error) throw error;
  return data;
}

async function agentReplies(conversationId: string, body: string) {
  const { error } = await supabaseAdmin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: SAM, sender_role: "agent", body });
  if (error) throw error;
}

/** Makes everything queued for a conversation due now, as if the waiting time had passed. */
async function makeDue(conversationId: string) {
  const { error } = await supabaseAdmin
    .from("email_queue")
    .update({ send_after: new Date(Date.now() - 60_000).toISOString() })
    .eq("conversation_id", conversationId);
  if (error) throw error;
}

async function queued(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("email_queue")
    .select("kind, outcome, done_at, attempts")
    .eq("conversation_id", conversationId)
    .order("created_at");
  if (error) throw error;
  return data;
}

/** Stands in for the mail provider: keeps what it was asked to send, and answers as told. */
function mailbox(result: SendEmailResult = { ok: true }) {
  const sent: EmailMessage[] = [];
  return {
    sent,
    to: (address: string) => sent.filter((email) => email.to === address),
    send: (message: EmailMessage) => {
      sent.push(message);
      return Promise.resolve(result);
    },
  };
}

afterAll(async () => {
  await supabaseAdmin.from("conversations").delete().in("contact_id", userIds);
  await Promise.all(userIds.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
});

describe("processEmailQueue", () => {
  it("emails a contact the replies they have not read, once, after the wait", async () => {
    const address = "queue.unread@example.org";
    const conversationId = await newConversation(address);
    await agentReplies(conversationId, "It ships tomorrow.");
    await agentReplies(conversationId, "Here is the tracking <link>.");

    // Not due yet: a reply waits five minutes for the contact to read it in the chat.
    const early = mailbox();
    await processEmailQueue(early.send);
    expect(early.to(address)).toHaveLength(0);

    await makeDue(conversationId);
    const post = mailbox();
    await processEmailQueue(post.send);

    const [email] = post.to(address);
    expect(post.to(address)).toHaveLength(1);
    expect(email?.subject).toBe("New reply from Helpwren Demo");
    expect(email?.text).toContain("You have 2 new replies from Helpwren Demo");
    expect(email?.text).toContain("Sam Rivera:\nIt ships tomorrow.");
    expect(email?.text).toContain("Continue the conversation: https://shop.example/orders");
    expect(email?.html).toContain("Here is the tracking &lt;link&gt;.");
    expect(await queued(conversationId)).toEqual([
      expect.objectContaining({ kind: "reply", outcome: "sent" }),
      expect.objectContaining({ kind: "reply", outcome: "sent" }),
    ]);

    // Run again, nothing is sent twice.
    const again = mailbox();
    await processEmailQueue(again.send);
    expect(again.to(address)).toHaveLength(0);
  });

  it("sends nothing for a reply the contact has already read", async () => {
    const address = "queue.read@example.org";
    const conversationId = await newConversation(address);
    await agentReplies(conversationId, "All sorted.");
    await supabaseAdmin
      .from("conversations")
      .update({ unread_for_contact: 0 })
      .eq("id", conversationId);
    await makeDue(conversationId);

    const post = mailbox();
    await processEmailQueue(post.send);
    expect(post.to(address)).toHaveLength(0);
    expect(await queued(conversationId)).toEqual([
      expect.objectContaining({ kind: "reply", outcome: "skipped" }),
    ]);
  });

  it("tells a contact where their ticket stands when the team changes it", async () => {
    const address = "queue.status@example.org";
    const conversationId = await newConversation(address, "Late delivery");
    const change = (from: string, to: string) =>
      supabaseAdmin.from("conversation_events").insert({
        conversation_id: conversationId,
        actor_id: SAM,
        kind: "status_changed",
        data: { from, to },
      });
    await change("open", "pending");
    await change("pending", "resolved");

    const post = mailbox();
    await processEmailQueue(post.send);

    // Two changes, one email: only where it stands now is news.
    const [email] = post.to(address);
    expect(post.to(address)).toHaveLength(1);
    expect(email?.subject).toMatch(/^#\d+ Late delivery: Resolved$/);
    expect(email?.text).toContain("Your ticket is now resolved");
    expect(await queued(conversationId)).toEqual([
      expect.objectContaining({ kind: "status", outcome: "skipped" }),
      expect.objectContaining({ kind: "status", outcome: "sent" }),
    ]);
  });

  it("tries again when the provider cannot be reached, and gives up on a refusal", async () => {
    const address = "queue.retry@example.org";
    const conversationId = await newConversation(address);
    await agentReplies(conversationId, "Still there?");
    await makeDue(conversationId);

    const down = mailbox({ ok: false, reason: "failed", detail: "timeout" });
    await processEmailQueue(down.send);
    expect(down.to(address)).toHaveLength(1);
    expect(await queued(conversationId)).toEqual([
      expect.objectContaining({ outcome: null, done_at: null, attempts: 1 }),
    ]);

    const refused = mailbox({ ok: false, reason: "rejected", detail: "bad address" });
    await processEmailQueue(refused.send);
    expect(await queued(conversationId)).toEqual([
      expect.objectContaining({ outcome: "failed", attempts: 2 }),
    ]);
  });
});

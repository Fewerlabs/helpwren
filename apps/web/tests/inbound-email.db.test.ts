import { signWebhook, type GenericInboundEmail } from "@helpwren/adapters";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as inbound } from "@/app/api/email/inbound/[provider]/route";
import { type EmailMessage } from "@/lib/email";
import {
  getReplyKeys,
  INBOUND_SECRET,
  REPLY_KEYS_SECRET,
  replyAddressFor,
} from "@/lib/email/inbound";
import { processEmailQueue } from "@/lib/email/queue";
import { findReplyToken } from "@/lib/email/reply-address";
import { supabaseAdmin } from "@/lib/supabase/admin";

// The inbound route, called directly against the local database, with replies by email on and
// received through the generic adapter. Sam is an agent in the demo data.
const SAM = "a0000000-0000-4000-8000-000000000002";
const SECRET = `whsec_${crypto.randomUUID()}`;
const REPLY_ADDRESS = "reply@support.inbound-test.example";
const inboundSettings = { enabled: true, address: REPLY_ADDRESS, provider: "generic" } as const;
const run = crypto.randomUUID().slice(0, 8);
const userIds: string[] = [];

// What was there before, put back afterwards: the database is shared.
let savedEmail: unknown;
let savedSecret: unknown;
let hadReplyKeys = false;

async function secret(key: string) {
  const { data } = await supabaseAdmin.from("secrets").select("value").eq("key", key).maybeSingle();
  return data?.value;
}

beforeAll(async () => {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "email")
    .maybeSingle();
  savedEmail = data?.value;
  savedSecret = await secret(INBOUND_SECRET);
  hadReplyKeys = (await secret(REPLY_KEYS_SECRET)) !== undefined;

  const email = typeof savedEmail === "object" && savedEmail !== null ? savedEmail : {};
  await supabaseAdmin.from("settings").upsert({
    key: "email",
    value: { ...email, fromAddress: "support@inbound-test.example", inbound: inboundSettings },
    is_public: false,
  });
  await supabaseAdmin.from("secrets").upsert({ key: INBOUND_SECRET, value: SECRET });
});

afterAll(async () => {
  // The files these tests stored go with the conversations they were in.
  const { data: conversations } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .in("contact_id", userIds);
  for (const { id } of conversations ?? []) {
    const { data: files } = await supabaseAdmin.storage.from("attachments").list(id);
    if (files?.length) {
      await supabaseAdmin.storage
        .from("attachments")
        .remove(files.map((file) => `${id}/${file.name}`));
    }
  }
  await supabaseAdmin.from("conversations").delete().in("contact_id", userIds);
  await Promise.all(userIds.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
  await (savedEmail === undefined
    ? supabaseAdmin.from("settings").delete().eq("key", "email")
    : supabaseAdmin
        .from("settings")
        .update({ value: savedEmail as never })
        .eq("key", "email"));
  await (savedSecret === undefined
    ? supabaseAdmin.from("secrets").delete().eq("key", INBOUND_SECRET)
    : supabaseAdmin
        .from("secrets")
        .update({ value: savedSecret as never })
        .eq("key", INBOUND_SECRET));
  if (!hadReplyKeys) await supabaseAdmin.from("secrets").delete().eq("key", REPLY_KEYS_SECRET);
});

/** A contact with an email address and a conversation they started. */
async function newConversation(email: string) {
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const contactId = created.data.user.id;
  userIds.push(contactId);
  const { data, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: contactId,
    body: "My parcel has not come.",
    source: "web",
    contact_name: "Inbound Tester",
    contact_email: email,
  });
  if (error) throw error;
  return { conversationId: data, contactId };
}

function post(provider: string, email: GenericInboundEmail, secret = SECRET) {
  const body = JSON.stringify(email);
  return inbound(
    new Request(`http://localhost/api/email/inbound/${provider}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "helpwren-signature": signWebhook(body, secret, Math.floor(Date.now() / 1000)),
      },
      body,
    }),
    { params: Promise.resolve({ provider }) },
  );
}

async function messagesIn(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("sender_role, body, channel, attachments")
    .eq("conversation_id", conversationId)
    .order("created_at");
  if (error) throw error;
  return data;
}

const quoted = (words: string) =>
  `${words}\n\nOn Wed, 19 Nov 2026 at 10:00, Helpwren Demo <${REPLY_ADDRESS}> wrote:\n> It ships tomorrow.`;

describe("replying by email", () => {
  it("adds a reply sent to the signed address as the contact, once", async () => {
    const address = `inbound.good.${run}@example.org`;
    const { conversationId, contactId } = await newConversation(address);
    const replyTo = await replyAddressFor(inboundSettings, conversationId, contactId);
    if (!replyTo) throw new Error("No reply address.");

    const email: GenericInboundEmail = {
      from: `Inbound Tester <${address.toUpperCase()}>`,
      to: [`Helpwren Demo <${replyTo}>`],
      subject: "Re: New reply from Helpwren Demo",
      text: quoted("Still nothing, I'm afraid."),
      messageId: `<good-${run}@example.org>`,
      attachments: [
        { name: "photo-of-door.txt", type: "text/plain", content: btoa("a door") },
        { name: "setup.exe", type: "application/x-msdownload", content: btoa("MZ") },
      ],
    };
    const response = await post("generic", email);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ outcome: "added" });

    const [, reply] = await messagesIn(conversationId);
    expect(reply).toMatchObject({
      sender_role: "guest",
      channel: "email",
      body: "Still nothing, I'm afraid.\n\nNot attached: setup.exe (this kind of file cannot be sent).",
      attachments: [expect.objectContaining({ name: "photo-of-door.txt", type: "text/plain" })],
    });

    // A provider sending the same email again adds nothing.
    await expect((await post("generic", email)).json()).resolves.toEqual({ outcome: "duplicate" });
    expect(await messagesIn(conversationId)).toHaveLength(2);
  });

  it("turns away a request the provider did not sign, and a provider that is not chosen", async () => {
    const email: GenericInboundEmail = { from: "a@example.org", to: [REPLY_ADDRESS], text: "Hi" };
    expect((await post("generic", email, "whsec_someone_else")).status).toBe(401);
    expect((await post("postmark", email)).status).toBe(404);
    expect((await post("smtp", email)).status).toBe(404);
  });

  it("ignores mail with a missing or forged token, saying nothing about the conversation", async () => {
    const address = `inbound.forged.${run}@example.org`;
    const { conversationId, contactId } = await newConversation(address);
    const replyTo = (await replyAddressFor(inboundSettings, conversationId, contactId)) ?? "";
    const token = findReplyToken([replyTo], REPLY_ADDRESS) ?? "";
    const forged = `${token.slice(0, -6)}${token.endsWith("aaaaaa") ? "bbbbbb" : "aaaaaa"}`;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    for (const to of [REPLY_ADDRESS, `reply+${forged}@support.inbound-test.example`]) {
      const response = await post("generic", {
        from: address,
        to: [to],
        text: "Let me in",
        messageId: `<forged-${to}-${run}@example.org>`,
      });
      await expect(response.json()).resolves.toEqual({ outcome: "ignored" });
    }
    expect(await messagesIn(conversationId)).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("signature does not match"));
    warn.mockRestore();
  });

  it("keeps a reply from another address out of the conversation", async () => {
    const address = `inbound.sender.${run}@example.org`;
    const { conversationId, contactId } = await newConversation(address);
    const replyTo = (await replyAddressFor(inboundSettings, conversationId, contactId)) ?? "";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await post("generic", {
      from: "forwarded.to@example.org",
      to: [replyTo],
      text: "I was forwarded this",
      messageId: `<sender-${run}@example.org>`,
    });
    await expect(response.json()).resolves.toEqual({ outcome: "ignored" });
    expect(await messagesIn(conversationId)).toHaveLength(1);
    const { data } = await supabaseAdmin
      .from("inbound_emails")
      .select("sender, outcome")
      .eq("conversation_id", conversationId);
    expect(data).toEqual([{ sender: "forwarded.to@example.org", outcome: "wrong_sender" }]);
    vi.restoreAllMocks();
  });

  it("sends emails with the signed reply address and a thread to reply into", async () => {
    const address = `inbound.outbound.${run}@example.org`;
    const { conversationId, contactId } = await newConversation(address);
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: SAM,
      sender_role: "agent",
      body: "On it.",
    });
    await supabaseAdmin
      .from("email_queue")
      .update({ send_after: new Date(Date.now() - 60_000).toISOString() })
      .eq("conversation_id", conversationId);

    const sent: EmailMessage[] = [];
    await processEmailQueue((message) => {
      sent.push(message);
      return Promise.resolve({ ok: true });
    });

    const email = sent.find((message) => message.to === address);
    expect(email?.replyTo).toBe(await replyAddressFor(inboundSettings, conversationId, contactId));
    expect(email?.text).toContain("Reply to this email, or continue in the chat.");
    expect(email?.references).toEqual([`helpwren.${conversationId}@support.inbound-test.example`]);
    expect(email?.inReplyTo).toBe(`helpwren.${conversationId}@support.inbound-test.example`);
    expect(email?.messageId).toMatch(new RegExp(`^helpwren\\.${conversationId}\\..+@`));
    expect(await getReplyKeys()).toHaveLength(1);
  });
});

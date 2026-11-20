import { randomBytes } from "node:crypto";

import { signWebhook } from "@helpwren/adapters";
import { expect, test } from "@playwright/test";

import { replyAddress, signReplyToken, type ReplyKey } from "../src/lib/email/reply-address";
import { database, removeContactByEmail, RUN } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A contact answers the team's email from their mail app, and the answer shows in the inbox and
// in their chat. The provider is played by posting what the generic adapter takes. Runs against
// the local Supabase stack, where Ada is an admin.
const VISITOR = { name: `Tomás Ruiz ${RUN}`, email: `tomas.${RUN}@example.org` };
const REPLY_ADDRESS = "reply@support.e2e.example";
const KEYS = "email_reply_keys";
const SECRET = "inbound_email_secret";

let savedEmail: unknown;
let savedSecret: unknown;
let savedKeys: unknown;

async function stored(table: "settings" | "secrets", key: string): Promise<unknown> {
  const { data } = await database.from(table).select("value").eq("key", key).maybeSingle();
  return data?.value;
}

async function putBack(table: "settings" | "secrets", key: string, value: unknown) {
  await (value === undefined
    ? database.from(table).delete().eq("key", key)
    : database.from(table).upsert({ key, value: value as never }));
}

test.beforeAll(async () => {
  savedEmail = await stored("settings", "email");
  savedSecret = await stored("secrets", SECRET);
  savedKeys = await stored("secrets", KEYS);
});
test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});
test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
  await putBack("settings", "email", savedEmail);
  await putBack("secrets", SECRET, savedSecret);
  await putBack("secrets", KEYS, savedKeys);
});

/** The key the install signs reply addresses with, made here if the install has none yet. */
async function replyKey(): Promise<ReplyKey> {
  const keys = (await stored("secrets", KEYS)) as ReplyKey[] | undefined;
  if (keys?.[0]) return keys[0];
  const key = { version: 1, secret: randomBytes(32).toString("base64url") };
  await database.from("secrets").upsert({ key: KEYS, value: [key] });
  return key;
}

test("a contact's answer by email lands in the inbox and in their chat", async ({ browser }) => {
  const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const inbox = await agentContext.newPage();
  const chat = await visitorContext.newPage();

  // The admin turns replies by email on, with the generic adapter and its secret.
  await signInToInbox(inbox, "ada@example.com");
  await inbox.goto("/dashboard/settings/email");
  await inbox.getByRole("switch", { name: "Let contacts reply by email" }).click();
  await inbox.getByLabel("Reply address").fill(REPLY_ADDRESS);
  await inbox.getByRole("combobox", { name: "Received by" }).click();
  await inbox.getByRole("option", { name: "Another provider (signed JSON)" }).click();
  await expect(inbox.getByLabel("Webhook address")).toContainText("/api/email/inbound/generic");
  await inbox.getByRole("button", { name: "Make a secret" }).click();
  await expect(inbox.getByText("Copy the secret now")).toBeVisible();
  await inbox.getByRole("button", { name: "Save changes" }).click();
  await expect(inbox.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  const secret = await stored("secrets", SECRET);
  expect(typeof secret).toBe("string");
  expect(await stored("settings", "email")).toMatchObject({
    inbound: { enabled: true, address: REPLY_ADDRESS, provider: "generic" },
  });

  // The visitor writes, and the team replies.
  await chat.goto("/embed");
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(VISITOR.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await chat
    .getByLabel("Your message")
    .pressSequentially("Do you deliver on Sundays?", { delay: 10 });
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText("Do you deliver");

  await inbox.goto("/dashboard/inbox");
  const list = inbox.getByRole("list", { name: "Conversations" });
  await list.getByRole("button", { name: new RegExp(VISITOR.name) }).click();
  const reply = inbox.getByRole("textbox", { name: "Your message" });
  await reply.fill("Not yet, but Saturdays are fine.");
  await reply.press("Enter");
  const agentMessages = inbox.getByRole("log", { name: "Messages" });
  await expect(agentMessages.getByText("Not yet, but Saturdays are fine.")).toBeVisible();

  // The visitor closes the chat and answers the email from their mail app instead.
  const { data: contact } = await database
    .from("contacts")
    .select("id, conversations(id)")
    .eq("email", VISITOR.email)
    .single();
  const conversationId = contact?.conversations[0]?.id ?? "";
  const to = replyAddress(
    REPLY_ADDRESS,
    signReplyToken(await replyKey(), conversationId, contact?.id ?? ""),
  );
  const body = JSON.stringify({
    from: `${VISITOR.name} <${VISITOR.email}>`,
    to: [to],
    subject: "Re: New reply from Helpwren Demo",
    text: `Saturday it is.\n\nOn Wed, 19 Nov 2026 at 10:00, Helpwren Demo <${to}> wrote:\n> Not yet, but Saturdays are fine.`,
    messageId: `<e2e-${conversationId}@example.org>`,
  });
  const response = await inbox.request.post("/api/email/inbound/generic", {
    headers: {
      "content-type": "application/json",
      "helpwren-signature": signWebhook(body, String(secret), Math.floor(Date.now() / 1000)),
    },
    data: body,
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ outcome: "added" });

  // It arrives live in the inbox, marked as email, without the quoted reply.
  await expect(agentMessages.getByText("Saturday it is.")).toBeVisible();
  await expect(agentMessages.getByText("via email")).toBeVisible();
  await expect(agentMessages.getByText("Saturday it is.")).not.toContainText("wrote:");
  await expect(inbox.getByRole("region", { name: "Details" })).toContainText(
    "Also replied by email",
  );

  // And in the visitor's chat.
  await expect(
    chat.getByRole("log", { name: "Messages" }).getByText("Saturday it is."),
  ).toBeVisible();
});

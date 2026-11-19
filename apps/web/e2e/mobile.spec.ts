import { deliveryScript, readFrameMessage } from "@helpwren/react-native/bridge";
import { expect, test, type Page } from "@playwright/test";
import { type FrameMessage, type PageMessage } from "helpwren/protocol";
import { SignJWT } from "jose";

import { database } from "./support/database";

// The chat as a screen of a mobile app. The browser plays the app's web view: the page gets a
// `window.ReactNativeWebView` to send to, and the app's messages arrive through the very script
// `@helpwren/react-native` injects. Runs against the local Supabase stack and its demo data.
const KEY = { id: "mobile", secret: "mobile-signing-secret-mobile-signing-secret" };
const AGENT_ID = "a0000000-0000-4000-8000-000000000002";
const run = crypto.randomUUID();
const userId = `e2e-${run}-mobile`;

declare global {
  interface Window {
    /** What the chat has sent the pretend app, as the strings it sent. */
    fromChat?: string[];
  }
}

/** Opens the chat the way the support screen does, in a web view that records what it hears. */
async function openInApp(page: Page) {
  await page.addInitScript(() => {
    window.fromChat = [];
    window.ReactNativeWebView = {
      postMessage: (message: string) => {
        window.fromChat?.push(message);
      },
    };
  });
  await page.goto("/embed?source=web");
}

async function heard(page: Page): Promise<FrameMessage[]> {
  const sent = await page.evaluate(() => window.fromChat ?? []);
  return sent.map(readFrameMessage).filter((message) => message !== null);
}

function tell(page: Page, message: PageMessage) {
  return page.evaluate(deliveryScript(message));
}

function tokenFor(subject: string) {
  return new SignJWT({ name: "Rosa Lindqvist" })
    .setProtectedHeader({ alg: "HS256", kid: KEY.id })
    .setSubject(subject)
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(KEY.secret));
}

test.beforeAll(async () => {
  await database.from("settings").upsert({ key: "identity", value: { mode: "signed_token" } });
  await database.from("secrets").upsert({ key: "identity_keys", value: [KEY] });
});

test.afterAll(async () => {
  await database.from("settings").delete().eq("key", "identity");
  await database.from("secrets").delete().eq("key", "identity_keys");
  const { data } = await database.from("contacts").select("id").eq("external_id", userId);
  for (const { id } of data ?? []) {
    await database.from("conversations").delete().eq("contact_id", id);
    await database.auth.admin.deleteUser(id);
  }
});

test("an app signs its user in, opens the conversation a notification was about, and hears the badge", async ({
  page,
}) => {
  await openInApp(page);
  await expect
    .poll(async () => (await heard(page)).map((message) => message.type))
    .toContain("ready");

  // The app greets the chat, with no page address, and hands over its user's token.
  await tell(page, { channel: "helpwren", type: "hello", closable: true, identified: true });
  await tell(page, { channel: "helpwren", type: "context", context: { appVersion: "3.2.0" } });
  await tell(page, { channel: "helpwren", type: "identify", token: await tokenFor(userId) });
  await expect
    .poll(async () => (await heard(page)).filter((message) => message.type === "identity"))
    .toEqual([{ channel: "helpwren", type: "identity", state: "user" }]);

  // The team replied to an earlier conversation, and the app tells the chat to open it, as a
  // tapped notification would.
  const { data: contact } = await database
    .from("contacts")
    .select("id")
    .eq("external_id", userId)
    .single();
  const { data: conversationId } = await database.rpc("start_conversation", {
    contact_id: contact?.id ?? "",
    body: "Where is my refund?",
    source: "web",
  });
  await database.from("messages").insert({
    conversation_id: conversationId ?? "",
    sender_id: AGENT_ID,
    sender_role: "agent",
    body: "It went out this morning.",
  });
  await expect
    .poll(async () => (await heard(page)).filter((message) => message.type === "unread").at(-1))
    .toEqual({ channel: "helpwren", type: "unread", count: 1 });

  await tell(page, { channel: "helpwren", type: "open", conversationId: conversationId ?? "" });
  const messages = page.getByRole("log", { name: "Messages" });
  await expect(messages).toContainText("It went out this morning.");
  // Reading it clears the badge in the app.
  await expect
    .poll(async () => (await heard(page)).filter((message) => message.type === "unread").at(-1))
    .toEqual({ channel: "helpwren", type: "unread", count: 0 });

  // The chat's own close button goes back to the app.
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect
    .poll(async () => (await heard(page)).map((message) => message.type))
    .toContain("close");

  // Logging out of the app leaves a guest's chat.
  await tell(page, { channel: "helpwren", type: "reset" });
  await expect
    .poll(async () => (await heard(page)).filter((message) => message.type === "identity").at(-1))
    .toEqual({ channel: "helpwren", type: "identity", state: "guest" });
  await expect(page.getByRole("button", { name: "Send us a message" })).toBeVisible();
});

test("a message from another window is not taken for the app's", async ({ page }) => {
  await openInApp(page);
  await expect
    .poll(async () => (await heard(page)).map((message) => message.type))
    .toContain("ready");

  // A message with a source, as any other window's would have, is ignored.
  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { channel: "helpwren", type: "hello", identified: false },
        source: window,
        origin: "https://evil.example",
      }),
    );
  });
  await tell(page, { channel: "helpwren", type: "reset" });
  // Not introduced, so the chat says nothing back to the reset.
  await page.waitForTimeout(500);
  expect((await heard(page)).filter((message) => message.type !== "ready")).toEqual([]);
});

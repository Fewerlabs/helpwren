import { expect, test } from "@playwright/test";

import { database, removeContactByEmail } from "./support/database";

// The widget on a site of its own: examples/plain-html, served from another origin than the
// app. Runs against the local Supabase stack and its demo data.
const SITE = "http://127.0.0.1:4100/";
const VISITOR = { name: "Tomas Lind", email: "tomas.e2e@example.org" };
const AGENT_ID = "a0000000-0000-4000-8000-000000000002";

async function setAllowedDomains(domains: string[] | null) {
  await database.from("settings").delete().eq("key", "allowed_domains");
  if (domains) {
    await database
      .from("settings")
      .insert({ key: "allowed_domains", value: domains, is_public: false });
  }
}

test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});
test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
  await setAllowedDomains(null);
});

test("a visitor chats through the widget on another site", async ({ page }) => {
  await page.goto(SITE);
  const launcher = page.getByRole("button", { name: "Open chat" });
  const chat = page.frameLocator('iframe[title="Chat"]');

  // The chat is closed until asked for.
  await expect(chat.getByRole("heading", { name: "Hi there. How can we help?" })).toBeHidden();
  await launcher.click();
  await expect(chat.getByRole("heading", { name: "Hi there. How can we help?" })).toBeVisible();

  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(VISITOR.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await chat.getByLabel("Your message").fill("Is there a student discount?");
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(
    "Is there a student discount?",
  );

  // The team sees which page the visitor wrote from.
  const { data: conversation } = await database
    .from("conversations")
    .select("id, context, contact:contacts!inner(email)")
    .eq("contact.email", VISITOR.email)
    .single();
  expect(conversation?.context).toMatchObject({
    url: SITE,
    title: "Helpwren example: a plain HTML page",
  });

  // With the chat closed, a reply shows as a count on the launcher and on the site's own button.
  await chat.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Close chat" }).first().click();
  await database.from("messages").insert({
    conversation_id: conversation?.id ?? "",
    sender_id: AGENT_ID,
    sender_role: "agent",
    body: "There is: 20% off with a student email.",
  });
  await expect(launcher).toContainText("1");
  await expect(page.getByRole("button", { name: "Help (1)" })).toBeVisible();

  // The site's own button opens the chat too, and reading the reply clears the count.
  await page.getByRole("button", { name: "Help (1)" }).click();
  await chat.getByRole("region", { name: "Recent message" }).getByRole("button").click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText("20% off");
  await expect(page.getByRole("button", { name: "Help", exact: true })).toBeVisible();

  // The close button inside the chat closes the panel.
  await chat.getByRole("button", { name: "Close chat" }).click();
  await expect(launcher).toBeVisible();
  await expect(chat.getByRole("log", { name: "Messages" })).toBeHidden();
});

test("only allowed sites can show the chat, once domains are set", async ({ page }) => {
  await setAllowedDomains(["example.com"]);
  await page.goto(SITE);
  await page.getByRole("button", { name: "Open chat" }).click();
  const chat = page.frameLocator('iframe[title="Chat"]');
  // The browser refuses to load the chat into a frame on a site that is not listed.
  await expect(chat.getByRole("button", { name: "Send us a message" })).toHaveCount(0);

  await setAllowedDomains(["example.com", "127.0.0.1:4100"]);
  await page.reload();
  await page.getByRole("button", { name: "Open chat" }).click();
  await expect(chat.getByRole("button", { name: "Send us a message" })).toBeVisible();
});

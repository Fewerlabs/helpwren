import { expect, test } from "@playwright/test";

import { RUN, database, removeContactByEmail } from "./support/database";

// The widget on a site of its own: examples/plain-html, served from another origin than the
// app. Runs against the local Supabase stack and its demo data.
const SITE = "http://127.0.0.1:4100/";
const VISITOR = { name: `Tomas Lind ${RUN}`, email: `tomas.${RUN}@example.org` };
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
  await chat
    .getByLabel("Your message")
    .pressSequentially("Is there a student discount?", { delay: 10 });
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

test("only allowed sites can show the chat, once domains are set", async ({ browser }) => {
  await setAllowedDomains(["example.com"]);
  const refused = await browser.newPage();
  const errors: string[] = [];
  refused.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await refused.goto(SITE);
  // No launcher that would open on a blank panel: the widget says why and goes.
  await expect.poll(() => errors.join("\n")).toContain("may not show this chat");
  await expect(refused.getByRole("button", { name: "Open chat" })).toHaveCount(0);
  await refused.close();

  // A fresh browser, as the install's answer is kept for a minute.
  await setAllowedDomains(["example.com", "127.0.0.1:4100"]);
  const allowed = await browser.newPage();
  await allowed.goto(SITE);
  await allowed.getByRole("button", { name: "Open chat" }).click();
  const chat = allowed.frameLocator('iframe[title="Chat"]');
  await expect(chat.getByRole("button", { name: "Send us a message" })).toBeVisible();
  await allowed.close();
});

test("a site puts the chat inside its own page, and opens it its own way", async ({ page }) => {
  // Inline: the chat fills the page's own box, with no launcher and nothing to close.
  await page.goto(`${SITE}inline`);
  const box = page.locator("#support");
  const inline = box.frameLocator('iframe[title="Chat"]');
  await expect(inline.getByRole("button", { name: "Send us a message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open chat" })).toHaveCount(0);
  await expect(inline.getByRole("button", { name: "Close chat" })).toHaveCount(0);
  const size = await box.boundingBox();
  const frame = await box.locator("iframe").boundingBox();
  expect(Math.round(frame?.width ?? 0)).toBe(Math.round((size?.width ?? 0) - 2));

  // Floating: the page's own button opens it, and a draft is put in the box, not sent.
  await page.goto(SITE);
  const help = page.getByRole("button", { name: /^Help/ });
  await expect(help).toHaveAttribute("aria-expanded", "false");
  await help.click();
  await expect(help).toHaveAttribute("aria-expanded", "true");
  const chat = page.frameLocator('iframe[title="Chat"]');
  await expect(chat.getByRole("button", { name: "Send us a message" })).toBeVisible();

  await page.getByRole("button", { name: "Ask about my order" }).click();
  await expect(chat.getByLabel("Your message")).toHaveValue("I have a question about my order.");
  await expect(chat.getByRole("log", { name: "Messages" })).toHaveCount(0);
});

test("an article opens in a larger panel, and the visitor can put it back", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(SITE);
  await page.getByRole("button", { name: "Open chat" }).click();
  const chat = page.frameLocator('iframe[title="Chat"]');
  const panel = page.locator("[data-helpwren] .panel");
  const size = async () => {
    const box = await panel.boundingBox();
    return { width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0) };
  };

  await chat
    .getByRole("navigation", { name: "Chat" })
    .getByRole("button", { name: "Help" })
    .click();
  await chat.getByRole("button", { name: /Getting started/ }).click();
  const normal = await size();
  expect(normal).toEqual({ width: 400, height: 680 });

  // An article opens larger, from the same corner: as wide as it may be, and as tall as the
  // screen leaves room for above the launcher.
  await chat.getByRole("button", { name: /Add the chat to your website/ }).click();
  await expect(chat.getByRole("heading", { name: "Add the chat to your website" })).toBeVisible();
  await expect.poll(size).toEqual({ width: 760, height: 696 });
  const expanded = await panel.boundingBox();
  expect(Math.round((expanded?.x ?? 0) + (expanded?.width ?? 0))).toBe(1280 - 20);

  // Collapse puts it back and keeps focus on the same button, which then grows it again.
  await chat.getByRole("button", { name: "Collapse article" }).click();
  await expect(chat.getByRole("button", { name: "Expand article" })).toBeFocused();
  await expect.poll(size).toEqual(normal);
  await chat.getByRole("button", { name: "Expand article" }).click();
  await expect(chat.getByRole("button", { name: "Collapse article" })).toBeFocused();
  await expect.poll(size).toEqual({ width: 760, height: 696 });

  // Going back from the article puts it back too.
  await chat.getByRole("button", { name: "Back" }).click();
  await expect.poll(size).toEqual(normal);

  // On a phone the chat fills the screen, and offers nothing to grow.
  await chat.getByRole("button", { name: /Add the chat to your website/ }).click();
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(chat.getByRole("heading", { name: "Add the chat to your website" })).toBeVisible();
  await expect(chat.getByRole("button", { name: "Expand article" })).toBeHidden();
  await expect.poll(size).toEqual({ width: 390, height: 800 });
});

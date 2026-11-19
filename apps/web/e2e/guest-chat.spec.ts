import { expect, test } from "@playwright/test";

import { RUN, database, removeContactByEmail } from "./support/database";

// Runs against the local Supabase stack and its demo data, which asks guests for a name and an
// email or phone number. The team's side is played through the database until the inbox exists.
const VISITOR = { name: `Lena Fischer ${RUN}`, email: `lena.${RUN}@example.org` };
const AGENT_ID = "a0000000-0000-4000-8000-000000000002";

test.use({ viewport: { width: 390, height: 780 } });

test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});
test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
});

async function conversationOf(email: string) {
  const { data } = await database
    .from("conversations")
    .select("id, unread_for_contact, unread_for_agents, contact:contacts!inner(email)")
    .eq("contact.email", email)
    .single();
  if (!data) throw new Error(`No conversation for ${email}.`);
  return data;
}

async function replyAsAgent(conversationId: string, body: string) {
  await database
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: AGENT_ID, sender_role: "agent", body });
}

test("a visitor starts a conversation, gets a live reply, and finds it again later", async ({
  page,
}) => {
  await page.goto("/embed");
  await expect(page.getByRole("heading", { name: "Hi there. How can we help?" })).toBeVisible();
  await page.getByRole("button", { name: "Send us a message" }).click();

  // Nothing is sent until the form is complete.
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByText("Write a message.")).toBeVisible();

  await page.getByLabel("Your name").fill(VISITOR.name);
  await page.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await page.getByLabel("Your message").fill("Do you ship to Canada?");
  await page.getByRole("button", { name: "Send message" }).click();

  const messages = page.getByRole("log", { name: "Messages" });
  await expect(messages.getByText("Do you ship to Canada?")).toBeVisible();

  // A reply from the team appears without reloading.
  const { id } = await conversationOf(VISITOR.email);
  await replyAsAgent(id, "Yes, we do. Delivery takes about a week.");
  await expect(messages.getByText("Yes, we do. Delivery takes about a week.")).toBeVisible();
  // Seeing it marks it as read.
  await expect.poll(async () => (await conversationOf(VISITOR.email)).unread_for_contact).toBe(0);

  const composer = page.getByRole("textbox", { name: "Your message" });
  await composer.fill("Great, thank you!");
  await composer.press("Enter");
  await expect(messages.getByText("Great, thank you!")).toBeVisible();
  await expect(composer).toHaveValue("");
  await expect.poll(async () => (await conversationOf(VISITOR.email)).unread_for_agents).toBe(2);

  // Coming back later on the same device: the conversation is on the home screen.
  await page.reload();
  const recent = page.getByRole("region", { name: "Recent message" });
  await expect(recent.getByText("Great, thank you!")).toBeVisible();

  // A reply while away from the conversation shows as unread, there and on the Messages tab.
  await replyAsAgent(id, "You are welcome.");
  await expect(recent.getByText("You are welcome.")).toBeVisible();
  await expect(recent.getByText("1 unread")).toBeVisible();

  const tabs = page.getByRole("navigation", { name: "Chat" });
  await tabs.getByRole("button", { name: "Messages, 1 unread" }).click();
  const today = page.getByRole("region", { name: "Today" });
  await today.getByRole("button", { name: /You are welcome\./ }).click();
  await expect(messages.getByText("You are welcome.")).toBeVisible();

  // Opening it marked it as read, and back returns to the tab it was opened from.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "Messages", exact: true })).toBeVisible();

  // A returning visitor is not asked who they are again.
  await page.getByRole("button", { name: "Send us a message" }).click();
  await expect(page.getByLabel("Your message")).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveCount(0);
});

test("a visitor can give a phone number in place of an email", async ({ page }) => {
  await page.goto("/embed");
  await page.getByRole("button", { name: "Send us a message" }).click();
  await page.getByLabel("Your name").fill(VISITOR.name);
  await page.getByRole("radio", { name: "Phone" }).check();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);

  // The field starts on +234; a pasted number switches it.
  await expect(page.getByRole("combobox", { name: /country/i })).toContainText("+234");
  await page.getByLabel("Phone number").fill("+44 7700 900123");
  await page.getByLabel("Your message").fill("Please call me back.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log", { name: "Messages" })).toContainText("Please call me back.");

  const { data } = await database
    .from("contacts")
    .select("id, name, email")
    .eq("phone", "+447700900123")
    // Others trying the chat may use the same test number; the name carries this run's mark.
    .eq("name", VISITOR.name)
    .single();
  expect(data).toMatchObject({ name: VISITOR.name, email: null });
  if (data) {
    await database.from("conversations").delete().eq("contact_id", data.id);
    await database.auth.admin.deleteUser(data.id);
  }
});

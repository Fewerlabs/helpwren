import { expect, test } from "@playwright/test";

import { database, removeContactByEmail } from "./support/database";

// Runs against the local Supabase stack and its demo data, which asks guests for a name and an
// email or phone number. The team's side is played through the database until the inbox exists.
const VISITOR = { name: "Lena Fischer", email: "lena.e2e@example.org" };
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
  await expect(page.getByRole("heading", { name: "Helpwren Demo" })).toBeVisible();

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

  // Coming back later on the same device: the conversation is still there.
  await page.reload();
  const list = page.getByRole("list", { name: "Your conversations" });
  await expect(list.getByText("Great, thank you!")).toBeVisible();

  // A reply while the list is showing raises the unread count there.
  await replyAsAgent(id, "You are welcome.");
  await expect(list.getByText("You are welcome.")).toBeVisible();
  await expect(list.getByText("1 unread")).toBeVisible();

  await list.getByRole("button").click();
  await expect(messages.getByText("You are welcome.")).toBeVisible();

  // A returning visitor is not asked who they are again.
  await page.getByRole("button", { name: "Back to your conversations" }).click();
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByLabel("Your message")).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveCount(0);
});

test("a visitor can give a phone number in place of an email", async ({ page }) => {
  await page.goto("/embed");
  await page.getByLabel("Your name").fill(VISITOR.name);
  await page.getByRole("radio", { name: "Phone" }).check();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);

  // The field starts on the install's default country; a pasted number switches it.
  await expect(page.getByRole("combobox", { name: /country/i })).toContainText("+234");
  await page.getByLabel("Phone number").fill("+44 7700 900123");
  await page.getByLabel("Your message").fill("Please call me back.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log", { name: "Messages" })).toContainText("Please call me back.");

  const { data } = await database
    .from("contacts")
    .select("id, name, email")
    .eq("phone", "+447700900123")
    .single();
  expect(data).toMatchObject({ name: VISITOR.name, email: null });
  if (data) {
    await database.from("conversations").delete().eq("contact_id", data.id);
    await database.auth.admin.deleteUser(data.id);
  }
});

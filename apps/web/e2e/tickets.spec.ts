import { expect, test } from "@playwright/test";

import { database, removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A team member works a conversation from start to finish: takes it, makes it a ticket, leaves
// a note for the team, and resolves it. Runs against the local Supabase stack and its demo data.
const CONTACT = { name: "Ines Duarte", email: "ines.e2e@example.org" };

async function startConversation() {
  const created = await database.auth.admin.createUser({
    email: CONTACT.email,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const { data, error } = await database.rpc("start_conversation", {
    contact_id: created.data.user.id,
    body: "My order arrived with a cracked screen.",
    source: "web",
    contact_name: CONTACT.name,
    contact_email: CONTACT.email,
  });
  if (error) throw error;
  return data;
}

test.beforeEach(async () => {
  await removeContactByEmail(CONTACT.email);
});
test.afterEach(async () => {
  await removeContactByEmail(CONTACT.email);
});

test("a team member takes a conversation, makes it a ticket, notes it and resolves it", async ({
  page,
}) => {
  const conversationId = await startConversation();
  await signInToInbox(page, "sam@example.com");

  const views = page.getByRole("navigation", { name: "Inbox views" });
  const list = page.getByRole("list", { name: "Conversations" });
  const details = page.getByRole("region", { name: "Details" });

  // It arrives unassigned.
  await views.getByRole("link", { name: /Unassigned/ }).click();
  await list.getByRole("button", { name: new RegExp(CONTACT.name) }).click();
  await expect(page.getByRole("log", { name: "Messages" })).toContainText("cracked screen");

  // Taking it moves it to My inbox.
  await details.getByRole("combobox", { name: "Assignee" }).click();
  await page.getByRole("option", { name: "Sam Rivera" }).click();
  await views.getByRole("link", { name: /My inbox/ }).click();
  await expect(list.getByRole("button", { name: new RegExp(CONTACT.name) })).toBeVisible();

  // Converting gives it a number and a subject, in the header and the list.
  await list.getByRole("button", { name: new RegExp(CONTACT.name) }).click();
  await page.getByRole("button", { name: "Convert to ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Convert to ticket" });
  await dialog.getByRole("button", { name: "Convert to ticket" }).click();
  await expect(dialog.getByText("Say what the ticket is about.")).toBeVisible();
  await dialog.getByLabel("Subject").fill("Cracked screen on delivery");
  await dialog.getByRole("button", { name: "Convert to ticket" }).click();

  const conversation = page.getByRole("region", { name: `Conversation with ${CONTACT.name}` });
  await expect(conversation.getByRole("heading")).toContainText(
    /#\d{4}\s*Cracked screen on delivery/,
  );
  await expect(page.getByRole("button", { name: "Convert to ticket" })).toHaveCount(0);
  await expect(details.getByText(/^#\d{4}$/)).toBeVisible();
  await views.getByRole("link", { name: /Tickets/ }).click();
  await expect(list.getByRole("button", { name: /Cracked screen on delivery/ })).toBeVisible();

  // Priority is set from the details.
  await list.getByRole("button", { name: /Cracked screen on delivery/ }).click();
  await details.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "High" }).click();
  await expect(details.getByRole("combobox", { name: "Priority" })).toContainText("High");

  // A note is for the team: it is shown as one, and is not a message to the contact.
  await conversation.getByRole("button", { name: "Note" }).click();
  const note = conversation.getByRole("textbox", { name: "Your note" });
  await note.fill("Courier confirmed the damage. Refund approved.");
  await conversation.getByRole("button", { name: "Add note" }).click();
  const messages = page.getByRole("log", { name: "Messages" });
  await expect(messages.getByText("Courier confirmed the damage. Refund approved.")).toBeVisible();
  await expect(messages.getByText("Internal note")).toBeVisible();
  await expect(note).toHaveValue("");
  const sent = await database.from("messages").select("body").eq("conversation_id", conversationId);
  expect(sent.data).toEqual([{ body: "My order arrived with a cracked screen." }]);

  // Resolving takes it out of the active views, and it can be reopened.
  await conversation.getByRole("button", { name: "Resolve" }).click();
  await expect(conversation.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(list.getByRole("button", { name: /Cracked screen on delivery/ })).toHaveCount(0);
  await views.getByRole("link", { name: /Resolved/ }).click();
  await expect(list.getByRole("button", { name: /Cracked screen on delivery/ })).toBeVisible();

  const { data } = await database
    .from("conversations")
    .select("type, status, priority, subject")
    .eq("id", conversationId)
    .single();
  expect(data).toEqual({
    type: "ticket",
    status: "resolved",
    priority: "high",
    subject: "Cracked screen on delivery",
  });
});

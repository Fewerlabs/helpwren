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
  await details.getByRole("button", { name: /^Assignee:/ }).click();
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
  // Its history says who did what.
  const messages = page.getByRole("log", { name: "Messages" });
  await expect(messages.getByText("Sam Rivera took this")).toBeVisible();
  await expect(messages.getByText(/Sam Rivera converted this to ticket #\d{4}/)).toBeVisible();

  // Tickets are a table: number, subject, status and who has it.
  await views.getByRole("link", { name: /Tickets/ }).click();
  const table = page.getByRole("table", { name: "Tickets" });
  const row = table.getByRole("row").filter({ hasText: "Cracked screen on delivery" });
  await expect(row).toContainText(/#\d{4}/);
  await expect(row.getByRole("button", { name: /^Status of/ })).toContainText("Open");
  await expect(row.getByRole("button", { name: /^Assignee of/ })).toContainText("Sam Rivera");
  const number = /#\d{4}/.exec(await row.innerText())?.[0] ?? "";

  // Opening one shows its conversation in the table's place. Priority is set from the details.
  await row.getByRole("button", { name: "Cracked screen on delivery" }).click();
  await details.getByRole("button", { name: /^Priority:/ }).click();
  await page.getByRole("option", { name: "High" }).click();
  await expect(details.getByRole("button", { name: /^Priority:/ })).toContainText("High");
  await expect(messages.getByText("Sam Rivera set the priority to high")).toBeVisible();

  // A note is for the team: it is shown as one, and is not a message to the contact.
  await conversation.getByRole("button", { name: "Note" }).click();
  const note = conversation.getByRole("textbox", { name: "Your note" });
  await note.fill("Courier confirmed the damage. Refund approved.");
  await conversation.getByRole("button", { name: "Add note" }).click();
  await expect(messages.getByText("Courier confirmed the damage. Refund approved.")).toBeVisible();
  await expect(messages.getByText("Internal note")).toBeVisible();
  await expect(note).toHaveValue("");
  const sent = await database.from("messages").select("body").eq("conversation_id", conversationId);
  expect(sent.data).toEqual([{ body: "My order arrived with a cracked screen." }]);

  // Resolving asks first. It keeps the ticket open on screen, and it can be reopened.
  await conversation.getByRole("button", { name: "Resolve" }).click();
  await page
    .getByRole("alertdialog", { name: "Resolve this ticket?" })
    .getByRole("button", { name: "Resolve" })
    .click();
  await expect(conversation.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(messages.getByText("Sam Rivera marked this as resolved")).toBeVisible();

  // Back in the table it shows as resolved, and it leaves the active views.
  await conversation.getByRole("button", { name: "Back to the list" }).click();
  await expect(row.getByRole("button", { name: /^Status of/ })).toContainText("Resolved");
  await expect(row.getByRole("button", { name: /^Priority of/ })).toContainText("High");
  await views.getByRole("link", { name: /My inbox/ }).click();
  await expect(list.getByRole("button", { name: new RegExp(CONTACT.name) })).toHaveCount(0);

  // Status, priority and assignee can be changed from the table, without opening the ticket.
  // Each shows as itself, a chip or a name, and opens a list when pressed.
  await views.getByRole("link", { name: /Tickets/ }).click();
  await row.getByRole("button", { name: /^Priority of/ }).click();
  await page.getByRole("option", { name: "Low" }).click();
  await expect(row.getByRole("button", { name: /^Priority of/ })).toContainText("Low");
  await row.getByRole("button", { name: /^Assignee of/ }).click();
  await page.getByRole("option", { name: "Ada Okafor" }).click();
  await expect(row.getByRole("button", { name: /^Assignee of/ })).toContainText("Ada Okafor");
  await row.getByRole("button", { name: /^Status of/ }).click();
  await page.getByRole("option", { name: "Open" }).click();
  await expect(row.getByRole("button", { name: /^Status of/ })).toContainText("Open");
  await row.getByRole("button", { name: /^Status of/ }).click();
  await page.getByRole("option", { name: "Resolved" }).click();
  await page
    .getByRole("alertdialog", { name: "Resolve this ticket?" })
    .getByRole("button", { name: "Resolve" })
    .click();
  await expect(row.getByRole("button", { name: /^Status of/ })).toContainText("Resolved");
  await expect
    .poll(async () => {
      const { data: saved } = await database
        .from("conversations")
        .select("status, priority, assignee:agents(name)")
        .eq("id", conversationId)
        .single();
      return saved;
    })
    .toEqual({ status: "resolved", priority: "low", assignee: { name: "Ada Okafor" } });

  // The table is filtered and searched by the database.
  const tickets = page.getByRole("region", { name: "Tickets" });
  await tickets.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("option", { name: "Status" }).click();
  await page.getByRole("option", { name: "Open" }).click();
  await page.keyboard.press("Escape");
  await expect(tickets.getByRole("button", { name: "Status: Open" })).toBeVisible();
  await expect(row).toHaveCount(0);
  await expect(table.getByRole("row").filter({ hasText: "Wrong billing address" })).toBeVisible();
  await expect(tickets.getByRole("navigation", { name: "Tickets pages" })).toContainText(
    /tickets?|of \d+/,
  );

  await tickets.getByRole("button", { name: "Status: Open" }).click();
  await page.getByRole("option", { name: "Resolved" }).click();
  await page.keyboard.press("Escape");
  await expect(row).toBeVisible();
  await tickets.getByRole("button", { name: "Remove the Status filter" }).click();

  const ticketSearch = tickets.getByRole("searchbox", { name: "Search tickets" });
  await ticketSearch.fill("cracked");
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(row).toBeVisible();
  await ticketSearch.fill(number);
  await expect(table.getByRole("row")).toHaveCount(2);
  await ticketSearch.fill("nothing like this");
  await expect(tickets.getByText("No tickets match")).toBeVisible();
  await ticketSearch.fill("");
  await views.getByRole("link", { name: /My inbox/ }).click();

  // The inbox search finds it by its number.
  await page.getByRole("searchbox", { name: "Search conversations" }).fill(number);
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list.getByRole("button")).toContainText("Cracked screen on delivery");

  const { data } = await database
    .from("conversations")
    .select("type, status, priority, subject")
    .eq("id", conversationId)
    .single();
  expect(data).toEqual({
    type: "ticket",
    status: "resolved",
    priority: "low",
    subject: "Cracked screen on delivery",
  });
});

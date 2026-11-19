import { expect, test } from "@playwright/test";

import { RUN, database, removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A visitor opens a ticket themselves, from the chat, and the team finds it as one. Runs
// against the local Supabase stack and its demo data.
const VISITOR = { name: `Tomas Vega ${RUN}`, email: `tomas.${RUN}@example.org` };

async function restore() {
  await removeContactByEmail(VISITOR.email);
  await database.from("settings").delete().eq("key", "tickets");
}

test.beforeEach(restore);
test.afterEach(restore);

test("a visitor submits a ticket from the chat, and the team sees who opened it", async ({
  browser,
}) => {
  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const chat = await visitorContext.newPage();
  await chat.goto("/embed");

  await chat.getByRole("button", { name: "Submit a ticket" }).click();
  await expect(chat.getByRole("heading", { name: "New ticket" })).toBeVisible();
  await chat.getByRole("button", { name: "Submit ticket" }).click();
  await expect(chat.getByText("Say what the ticket is about.")).toBeVisible();

  await chat.getByLabel("Your name").fill(VISITOR.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await chat.getByLabel("Subject").fill("Refund for a late delivery");
  await chat.getByLabel("Details").fill("My parcel came nine days late.");
  await chat.getByRole("button", { name: "Submit ticket" }).click();

  // It is a ticket from the start: a number, its subject, and its place in the history.
  await expect(chat.getByText(/Ticket #\d{4}/)).toBeVisible();
  await expect(chat.getByText("Refund for a late delivery")).toBeVisible();
  const visitorMessages = chat.getByRole("log", { name: "Messages" });
  await expect(visitorMessages.getByText("My parcel came nine days late.")).toBeVisible();
  await expect(visitorMessages.getByText(/You opened ticket #\d{4}/)).toBeVisible();

  // The team finds it among the tickets, and its history says the contact opened it.
  const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const inbox = await agentContext.newPage();
  await signInToInbox(inbox, "sam@example.com");
  await inbox
    .getByRole("navigation", { name: "Inbox views" })
    .getByRole("link", { name: /Tickets/ })
    .click();
  const row = inbox
    .getByRole("table", { name: "Tickets" })
    .getByRole("row")
    .filter({ hasText: "Refund for a late delivery" });
  await expect(row).toContainText(VISITOR.name);
  await row.getByRole("button", { name: "Refund for a late delivery" }).click();
  await expect(
    inbox
      .getByRole("log", { name: "Messages" })
      .getByText(new RegExp(`${VISITOR.name} opened ticket #\\d{4}`)),
  ).toBeVisible();

  await agentContext.close();
  await visitorContext.close();
});

test("an install can turn ticket submission off", async ({ page }) => {
  await database
    .from("settings")
    .upsert({ key: "tickets", value: { fromChat: false }, is_public: true });

  await page.goto("/embed");
  await expect(page.getByRole("button", { name: "Send us a message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit a ticket" })).toHaveCount(0);
});

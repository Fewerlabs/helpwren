import { expect, test } from "@playwright/test";

import { database, newContact, removeContacts, RUN } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data, where Ada is an admin. The team and
// the conversation it is given are the test's own, named with this run's mark.
const TEAM = `Returns ${RUN}`;
const CONTACT = `Jonas Berg ${RUN}`;
let contactId = "";

test.beforeEach(async () => {
  const contact = await newContact({
    kind: "user",
    name: CONTACT,
    email: `jonas.${RUN}@northwind.example`,
    messages: ["One of our invoices shows the wrong billing address."],
  });
  contactId = contact.id;
});

test.afterEach(async () => {
  await database.from("teams").delete().eq("name", TEAM);
  await removeContacts([contactId]);
});

test("an admin makes a team, gives it a conversation, and finds it under that team", async ({
  page,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/team");

  // With no teams, the inbox has no Teams heading and conversations have no Team row.
  await page.getByRole("button", { name: "New team" }).click();
  const dialog = page.getByRole("dialog", { name: "New team" });
  await dialog.getByLabel("Name").fill(TEAM);
  await dialog.getByRole("combobox", { name: "Members" }).click();
  await page.getByRole("option", { name: "Sam Rivera" }).click();
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Add team" }).click();

  const teams = page.getByRole("list", { name: "Teams" });
  const row = teams.getByRole("listitem").filter({ hasText: TEAM });
  await expect(row).toContainText("1 person");

  // In the inbox the team has a view of its own, empty so far.
  await page.goto("/dashboard/inbox");
  const views = page.getByRole("navigation", { name: "Inbox views" });
  await expect(views.getByRole("link", { name: new RegExp(TEAM) })).toContainText("0");

  // Giving it a conversation puts that conversation in the view and in its history.
  const list = page.getByRole("list", { name: "Conversations" });
  await list.getByRole("button", { name: new RegExp(CONTACT) }).click();
  const details = page.getByRole("region", { name: "Details" });
  await details.getByRole("button", { name: /^Team:/ }).click();
  await page.getByRole("option", { name: TEAM }).click();
  await expect(
    page.getByRole("log", { name: "Messages" }).getByText(`Ada Okafor gave this to ${TEAM}`),
  ).toBeVisible();

  await views.getByRole("link", { name: new RegExp(TEAM) }).click();
  await expect(page).toHaveURL(/view=team(:|%3A)/);
  await expect(list.getByRole("button", { name: new RegExp(CONTACT) })).toBeVisible();
  await expect(views.getByRole("link", { name: new RegExp(TEAM) })).toContainText("1");

  // Removing the team asks first, and leaves the conversation where it was.
  await page.goto("/dashboard/settings/team");
  await page.getByRole("button", { name: `Remove, ${TEAM}` }).click();
  await page
    .getByRole("alertdialog", { name: `Remove ${TEAM}?` })
    .getByRole("button", { name: "Remove team" })
    .click();
  await expect(teams.getByText(TEAM)).toHaveCount(0);
});

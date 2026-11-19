import { expect, test } from "@playwright/test";

import { newContact, removeContacts, RUN } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack. The people here are made by the test, shaped like the
// demo's: a guest with details, and two verified users at one company. Their names carry this
// run's mark, so whoever else is in the database does not matter.
const PRIYA = `Priya Nair ${RUN}`;
const JONAS = `Jonas Berg ${RUN}`;
const MEI = `Mei Tanaka ${RUN}`;
const NORTHWIND = `Northwind Studio ${RUN}`;
const made: string[] = [];

test.beforeAll(async () => {
  const people = await Promise.all([
    newContact({
      kind: "guest",
      name: PRIYA,
      email: `priya.${RUN}@example.org`,
      messages: [`Do you offer a discount for charities? ${RUN}`],
    }),
    newContact({
      kind: "user",
      name: JONAS,
      email: `jonas.${RUN}@northwind.example`,
      verified: true,
      org: NORTHWIND,
      messages: [
        "One of our invoices shows the wrong billing address.",
        "It is the March invoice, number 2031.",
      ],
    }),
    newContact({
      kind: "user",
      name: MEI,
      email: `mei.${RUN}@northwind.example`,
      verified: true,
      org: NORTHWIND,
      messages: [`How do I add a colleague ${RUN} to our account?`],
      status: "resolved",
    }),
  ]);
  made.push(...people.map((person) => person.id));
});

test.afterAll(async () => {
  await removeContacts(made);
});

test("a team member browses, filters and searches contacts, and opens one", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page).toHaveURL(/\/dashboard\/contacts$/);

  const table = page.getByRole("table", { name: "Contacts" });
  // They have just written, so they are at the top, however many others there are.
  await expect(table.getByText(PRIYA)).toBeVisible();
  await expect(table.getByText(JONAS)).toBeVisible();

  // Segments narrow the list, and are part of the address.
  const segments = page.getByRole("navigation", { name: "Contact segments" });
  await segments.getByRole("link", { name: /Guests/ }).click();
  await expect(page).toHaveURL(/show=guests/);
  await expect(table.getByText(PRIYA)).toBeVisible();
  await expect(table.getByText(JONAS)).toHaveCount(0);

  await segments.getByRole("link", { name: /Everyone/ }).click();
  await page.getByRole("searchbox", { name: "Search contacts" }).fill(`${RUN}@northwind`);
  await expect(table.getByText(JONAS)).toBeVisible();
  await expect(table.getByText(MEI)).toBeVisible();
  await expect(table.getByText(PRIYA)).toHaveCount(0);
  // The footer shows how many there are, even when they fit on one page.
  const footer = page.getByRole("navigation", { name: "Contacts pages" });
  await expect(footer).toContainText("2 contacts");
  await expect(footer.getByRole("button", { name: "Next page" })).toBeDisabled();

  // Opening someone shows how to reach them and their conversations.
  await table.getByRole("button", { name: JONAS }).click();
  await expect(page).toHaveURL(/contact=/);
  const details = page.getByRole("region", { name: "Contact" });
  await expect(details.getByText(JONAS)).toBeVisible();
  await expect(details.getByText("Verified user")).toBeVisible();
  await expect(details.getByRole("link", { name: `jonas.${RUN}@northwind.example` })).toBeVisible();
  await expect(details.getByText(NORTHWIND)).toBeVisible();

  // A conversation there leads into the inbox, with it open.
  await details.getByRole("link", { name: /March invoice/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/inbox\?view=all&c=/);
  await expect(page.getByRole("log", { name: "Messages" })).toContainText("wrong billing address");
});

test("a team member searches the inbox by what was said and by who said it", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  const list = page.getByRole("list", { name: "Conversations" });
  const search = page.getByRole("searchbox", { name: "Search conversations" });

  // Words from a message, in a conversation that is not in the open view.
  await search.fill(`colleague ${RUN}`);
  await expect(page.getByRole("heading", { name: /Results/ })).toBeVisible();
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list.getByRole("button")).toContainText(MEI);

  await search.fill(PRIYA);
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list.getByRole("button")).toContainText(PRIYA);

  await search.fill(`nothing like this was ever said ${RUN}`);
  await expect(page.getByText("No conversations found")).toBeVisible();

  // Clearing the search returns to the view, where Priya's open conversation is near the top.
  await search.fill("");
  await expect(page.getByRole("heading", { name: /^All/ })).toBeVisible();
  await expect(list.getByText(`Do you offer a discount for charities? ${RUN}`)).toBeVisible();
});

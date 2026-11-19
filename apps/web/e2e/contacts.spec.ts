import { expect, test } from "@playwright/test";

import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data: two guests, one of them with no
// details, and two verified users at Northwind Studio.
test("a team member browses, filters and searches contacts, and opens one", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page).toHaveURL(/\/dashboard\/contacts$/);

  const table = page.getByRole("table", { name: "Contacts" });
  // By name and not by count, so people added while trying the app locally do not matter.
  await expect(table.getByText("Priya Nair")).toBeVisible();
  await expect(table.getByText("Jonas Berg")).toBeVisible();

  // Segments narrow the list, and are part of the address.
  const segments = page.getByRole("navigation", { name: "Contact segments" });
  await segments.getByRole("link", { name: /Guests/ }).click();
  await expect(page).toHaveURL(/show=guests/);
  await expect(table.getByText("Priya Nair")).toBeVisible();
  await expect(table.getByText("Jonas Berg")).toHaveCount(0);

  await segments.getByRole("link", { name: /Everyone/ }).click();
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("northwind");
  await expect(table.getByText("Jonas Berg")).toBeVisible();
  await expect(table.getByText("Priya Nair")).toHaveCount(0);
  // The search is in the address, so a reload or a shared link finds the same people.
  await expect(page).toHaveURL(/q=northwind/);
  // The footer shows how many there are, even when they fit on one page.
  const footer = page.getByRole("navigation", { name: "Contacts pages" });
  await expect(footer.getByText(/^\d+ contacts?$/)).toBeVisible();
  await expect(footer.getByRole("combobox", { name: "Rows per page" })).toHaveText("25");
  await expect(footer.getByRole("button", { name: "Next page" })).toBeDisabled();

  // Opening someone shows how to reach them and their conversations.
  await table.getByRole("button", { name: "Jonas Berg" }).click();
  await expect(page).toHaveURL(/contact=/);
  const details = page.getByRole("region", { name: "Contact" });
  await expect(details.getByText("Jonas Berg")).toBeVisible();
  await expect(details.getByText("Verified user")).toBeVisible();
  await expect(details.getByRole("link", { name: "jonas@northwind.example" })).toBeVisible();
  await expect(details.getByText("Northwind Studio")).toBeVisible();

  // A conversation there leads into the inbox, with it open.
  await details.getByRole("link", { name: /March invoice/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/inbox\?view=all&c=/);
  await expect(page.getByRole("log", { name: "Messages" })).toContainText("wrong billing address");
});

test("a filtered, paged contacts address opens the same view", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  // Users who have written, ten to a page: what a teammate would get from a shared link.
  await page.goto("/dashboard/contacts?show=users&conversations=some&size=10&q=northwind");

  const segments = page.getByRole("navigation", { name: "Contact segments" });
  await expect(segments.getByRole("link", { name: /Users/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("searchbox", { name: "Search contacts" })).toHaveValue("northwind");
  await expect(page.getByRole("button", { name: "Conversations: Has written" })).toBeVisible();
  const footer = page.getByRole("navigation", { name: "Contacts pages" });
  await expect(footer.getByRole("combobox", { name: "Rows per page" })).toHaveText("10");
  const table = page.getByRole("table", { name: "Contacts" });
  await expect(table.getByText("Jonas Berg")).toBeVisible();
  await expect(table.getByText("Priya Nair")).toHaveCount(0);

  // Back returns to the view before, filters and all.
  await segments.getByRole("link", { name: /Everyone/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/contacts$/);
  await page.goBack();
  await expect(page.getByRole("searchbox", { name: "Search contacts" })).toHaveValue("northwind");
  await expect(footer.getByRole("combobox", { name: "Rows per page" })).toHaveText("10");
  await expect(page.getByRole("button", { name: "Conversations: Has written" })).toBeVisible();
});

test("a team member searches the inbox by what was said and by who said it", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  const list = page.getByRole("list", { name: "Conversations" });
  const search = page.getByRole("searchbox", { name: "Search conversations" });

  // Words from a message, in a conversation that is not in the open view.
  await search.fill("colleague");
  await expect(page.getByRole("heading", { name: /Results/ })).toBeVisible();
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list.getByRole("button")).toContainText("Mei Tanaka");

  await search.fill("priya");
  await expect(list.getByRole("button")).toContainText("Priya Nair");

  await search.fill("nothing like this was ever said");
  await expect(page.getByText("No conversations found")).toBeVisible();

  // Clearing the search returns to the view.
  await search.fill("");
  await expect(page.getByRole("heading", { name: /^All/ })).toBeVisible();
  await expect(list.getByText("Do you offer a discount for charities?")).toBeVisible();
});

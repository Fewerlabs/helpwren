import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data: three collections holding six
// published articles and one draft. Everything made here is named "(e2e)" and removed after.
test.afterAll(async () => {
  await database.from("articles").delete().like("title", "%(e2e)%");
  await database.from("collections").delete().like("name", "%(e2e)%");
});

test("a team member browses, searches and filters the articles", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.getByRole("link", { name: "Help center" }).click();
  await expect(page).toHaveURL(/\/dashboard\/help$/);

  const table = page.getByRole("table", { name: "All articles" });
  await expect(table.getByText("Add the chat to your website")).toBeVisible();
  await expect(table.getByText("Messages arrive late")).toBeVisible();

  // A collection narrows the table, and is part of the address.
  const collections = page.getByRole("navigation", { name: "Collections" });
  await collections.getByRole("link", { name: /Troubleshooting/ }).click();
  await expect(page).toHaveURL(/collection=troubleshooting/);
  const troubleshooting = page.getByRole("table", { name: "Troubleshooting" });
  await expect(troubleshooting.getByText("The chat does not appear")).toBeVisible();
  await expect(troubleshooting.getByText("Read your invoice")).toHaveCount(0);

  // Drafts only.
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("option", { name: "Status" }).click();
  await page.getByRole("option", { name: "Draft" }).click();
  await page.keyboard.press("Escape");
  await expect(troubleshooting.getByText("Messages arrive late")).toBeVisible();
  await expect(troubleshooting.getByText("The chat does not appear")).toHaveCount(0);

  // Search looks through the words of every article, wherever it is filed.
  await collections.getByRole("link", { name: /All articles/ }).click();
  await page.getByRole("searchbox", { name: "Search articles" }).fill("tag manager");
  await expect(table.getByText("Add the chat to your website")).toBeVisible();
  await expect(table.getByText("Invite your team")).toHaveCount(0);
});

test("a team member writes an article, publishes it and takes it down again", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/help");

  // A collection to put it in.
  await page.getByRole("button", { name: "New collection" }).click();
  const collectionForm = page.getByRole("dialog", { name: "New collection" });
  await collectionForm.getByLabel("Name").fill("Shipping (e2e)");
  await collectionForm.getByRole("radio", { name: "Parcel" }).check();
  await collectionForm.getByRole("button", { name: "Add collection" }).click();
  await expect(page).toHaveURL(/collection=shipping-e2e/);
  await expect(page.getByText("Nothing in this collection yet")).toBeVisible();

  // The article starts as a draft, in the collection that was open.
  await page.getByRole("button", { name: "New article" }).click();
  const articleForm = page.getByRole("dialog", { name: "New article" });
  await articleForm.getByLabel("Title").fill("Track a parcel (e2e)");
  await articleForm.getByRole("button", { name: "Start writing" }).click();
  await expect(page).toHaveURL(/\/dashboard\/help\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("textbox", { name: "Address" })).toHaveValue("track-a-parcel-e2e");

  // Written the Notion way: a slash for a block, Markdown as typed.
  const body = page.getByRole("textbox", { name: "Article body" });
  await body.click();
  await page.keyboard.type("Every order has a tracking link.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/head");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Where to find it");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- In the email we sent when it shipped");
  await expect(body.getByRole("heading", { level: 2, name: "Where to find it" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Unsaved changes");

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();

  // A draft is not on the public help center.
  const response = await page.request.get("/help/shipping-e2e/track-a-parcel-e2e");
  expect(response.status()).toBe(404);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Article published")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Address" })).toBeDisabled();

  // Published: anyone can read it, with the heading the editor made.
  const published = await page.request.get("/help/shipping-e2e/track-a-parcel-e2e");
  expect(published.status()).toBe(200);
  expect(await published.text()).toContain("Where to find it");

  // Unpublishing asks first.
  await page.getByRole("button", { name: "Unpublish" }).click();
  await page
    .getByRole("alertdialog", { name: "Unpublish this article?" })
    .getByRole("button", { name: "Unpublish" })
    .click();
  await expect(page.getByText("Article unpublished")).toBeVisible();

  // Removing asks first, and goes back to the collection.
  await page.getByRole("button", { name: "Remove article" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page).toHaveURL(/collection=shipping-e2e/);
  await expect(page.getByText("Nothing in this collection yet")).toBeVisible();
});

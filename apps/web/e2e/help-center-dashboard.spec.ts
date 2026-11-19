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

  // Search looks through the words of every article, wherever it is filed. The filter stays
  // on from one collection to the next, so it is taken off first.
  await page.getByRole("button", { name: "Remove the Status filter" }).click();
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
  // The radio itself is hidden under its icon, which is what a person presses.
  await collectionForm.getByTitle("Parcel").click();
  await expect(collectionForm.getByRole("radio", { name: "Parcel" })).toBeChecked();
  await collectionForm.getByRole("button", { name: "Add collection" }).click();
  await expect(page).toHaveURL(/collection=shipping-e2e/);
  await expect(page.getByText("Nothing in this collection yet")).toBeVisible();

  // A new article opens straight in an empty editor, ready for its title. Nothing exists yet.
  await page.getByRole("button", { name: "New article" }).click();
  await expect(page).toHaveURL(/\/dashboard\/help\/new\?collection=shipping-e2e$/);
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("Not saved yet");
  await page.keyboard.type("Track a parcel (e2e)");

  // Once it has a title and some words, the draft is made, in the collection that was open,
  // and takes its own address. The editor stays as it was: the caret is still in the body.
  const body = page.getByRole("textbox", { name: "Article body" });
  await body.click();
  await page.keyboard.type("Every order has a tracking link.");
  await expect(page).toHaveURL(/\/dashboard\/help\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("status")).toHaveText(/^Saved/);
  await expect(page.getByRole("textbox", { name: "Slug" })).toHaveValue("track-a-parcel-e2e");
  await expect(page.getByRole("combobox", { name: "Collection" })).toContainText("Shipping (e2e)");
  await page.keyboard.type(" It comes by email.");
  await expect(body).toContainText("Every order has a tracking link. It comes by email.");

  // Written the Notion way: a slash for a block, Markdown as typed.
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
  await expect(page.getByRole("textbox", { name: "Slug" })).toBeDisabled();

  // Published: anyone can read it, with the heading the editor made. The help center keeps what
  // it reads for up to a minute; publishing clears that, and the change shows within a request
  // or two.
  await expect
    .poll(
      async () => {
        const published = await page.request.get("/help/shipping-e2e/track-a-parcel-e2e");
        return published.status() === 200 && (await published.text()).includes("Where to find it");
      },
      { timeout: 75_000, intervals: [500, 1_000, 2_000, 5_000] },
    )
    .toBe(true);

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

test("a team member moves a block by its grip, and turns it into another kind", async ({
  page,
}) => {
  await signInToInbox(page, "sam@example.com");
  // A published article; nothing here is saved, so it is left as it was.
  await page.goto("/dashboard/help/f1000000-0000-4000-8000-000000000003");
  const body = page.getByRole("textbox", { name: "Article body" });
  const blocks = body.locator(":scope > *");
  await expect(blocks.first()).toContainText("Visitors should feel");

  // The grip appears beside the block under the pointer, and drags it.
  await blocks.first().hover();
  const grip = page.getByRole("button", { name: "Block options" });
  const from = await grip.boundingBox();
  const to = await blocks.nth(2).boundingBox();
  if (!from || !to) throw new Error("The grip or the block to drop on was not drawn.");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 40, to.y + 4, { steps: 15 });
  await page.mouse.move(to.x + 41, to.y + to.height - 2, { steps: 5 });
  await page.mouse.up();
  await expect(blocks.first()).toHaveText("Logo and colours");
  await expect(page.getByRole("status")).toHaveText("Unsaved changes");

  // Pressed, the grip opens what can be done to the block.
  const heading = await blocks.nth(3).boundingBox();
  if (!heading) throw new Error("The heading was not drawn.");
  await page.mouse.move(heading.x + 30, heading.y + 5, { steps: 5 });
  await grip.click();
  await page.getByRole("button", { name: "Subheading" }).last().click();
  await expect(
    body.getByRole("heading", { level: 3, name: "Greeting and quick replies" }),
  ).toBeVisible();
});

test("a new article left without a word in it is never made", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  const count = async () =>
    (await database.from("articles").select("id", { count: "exact", head: true })).count;
  const before = await count();

  await page.goto("/dashboard/help/new");
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toBeFocused();
  // A title alone is not enough to make it.
  await page.keyboard.type("Only a title (e2e)");
  await page.waitForTimeout(1_500);
  await expect(page).toHaveURL(/\/dashboard\/help\/new$/);
  expect(await count()).toBe(before);
});

test("a team member puts a collection's articles in order with the keyboard", async ({ page }) => {
  const { data: collection } = await database
    .from("collections")
    .insert({ name: "Order (e2e)", slug: "order-e2e", icon: "book-open" })
    .select("id")
    .single();
  if (!collection) throw new Error("The collection was not made.");
  // One at a time, so each goes to the end of the collection after the one before.
  for (const [title, slug] of [
    ["First (e2e)", "first-e2e"],
    ["Second (e2e)", "second-e2e"],
    ["Third (e2e)", "third-e2e"],
  ] as const) {
    await database
      .from("articles")
      .insert({ collection_id: collection.id, title, slug, body: { type: "doc", content: [] } });
  }

  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/help?collection=order-e2e");
  const table = page.getByRole("table", { name: "Order (e2e)" });
  const titles = table.getByRole("rowheader");
  await expect(titles).toHaveText(["First (e2e)", "Second (e2e)", "Third (e2e)"]);

  // Space picks the row up, the arrows move it, and Space drops it. Each step is read out, and
  // the next key waits for it, as a person listening would.
  await table.getByRole("button", { name: "Reorder First (e2e)" }).focus();
  await page.keyboard.press("Space");
  const announcement = page.locator('[id^="DndLiveRegion"]').first();
  await expect(announcement).toHaveText("Picked up First (e2e), at position 1 of 3.");
  // The arrow keys are listened for a moment after the pick-up is announced; no person is
  // quicker than that, but a test is.
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await expect(announcement).toHaveText("First (e2e) moved to position 2 of 3.");
  await page.keyboard.press("ArrowDown");
  await expect(announcement).toHaveText("First (e2e) moved to position 3 of 3.");
  await page.keyboard.press("Space");
  await expect(announcement).toHaveText("First (e2e) dropped at position 3 of 3.");
  await expect(titles).toHaveText(["Second (e2e)", "Third (e2e)", "First (e2e)"]);

  // Escape puts a row back where it was.
  await table.getByRole("button", { name: "Reorder Second (e2e)" }).focus();
  await page.keyboard.press("Space");
  await expect(announcement).toHaveText(/^Picked up Second/);
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await expect(announcement).toHaveText(/^Second \(e2e\) moved to position 2/);
  await page.keyboard.press("Escape");
  await expect(announcement).toHaveText(/^Moving cancelled/);
  await expect(titles).toHaveText(["Second (e2e)", "Third (e2e)", "First (e2e)"]);

  // The new order was saved.
  await page.reload();
  await expect(titles).toHaveText(["Second (e2e)", "Third (e2e)", "First (e2e)"]);
});

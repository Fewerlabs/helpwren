import { expect, test, type Page } from "@playwright/test";

import { database, RUN } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Settings > Contextual help: the rules that map pages to help articles, their order, and the
// box to try a page. Everything here is made for this run and removed afterwards.
const SETTINGS = "/dashboard/settings/contextual-help";
const TAG = `refunds-${RUN}`;
const BOOKINGS = `Bookings pages ${RUN}`;
const CHECKOUT = `Checkout ${RUN}`;
let collectionId = "";

test.beforeAll(async () => {
  const { data: collection, error } = await database
    .from("collections")
    .insert({ name: `Rules (${RUN})`, slug: `rules-${RUN}` })
    .select("id")
    .single();
  if (error) throw error;
  collectionId = collection.id;
  const inserted = await database.from("articles").insert({
    collection_id: collectionId,
    title: `How refunds work ${RUN}`,
    slug: `how-refunds-work-${RUN}`,
    status: "published",
    tags: [TAG],
  });
  if (inserted.error) throw inserted.error;
});

test.afterAll(async () => {
  await database.from("help_rules").delete().like("name", `%${RUN}%`);
  await database.from("articles").delete().eq("collection_id", collectionId);
  await database.from("collections").delete().eq("id", collectionId);
});

/** Adds a rule through the dialog, as an admin does. */
async function addRule(
  page: Page,
  rule: { name: string; match: string; value: string; tags?: string; search?: string },
) {
  await page.getByRole("button", { name: "New rule" }).click();
  const dialog = page.getByRole("dialog", { name: "New rule" });
  await dialog.getByLabel("Name").fill(rule.name);
  await dialog.getByRole("combobox", { name: "When the page" }).click();
  await page.getByRole("option", { name: rule.match }).click();
  await dialog.getByRole("textbox", { name: rule.match }).fill(rule.value);
  if (rule.tags) {
    await dialog.getByRole("combobox", { name: "Tags, any of" }).fill(rule.tags);
    await dialog.getByRole("combobox", { name: "Tags, any of" }).press("Enter");
  }
  if (rule.search) await dialog.getByLabel("Search for").fill(rule.search);
  await dialog.getByRole("button", { name: "Add rule" }).click();
  await expect(dialog).toBeHidden();
}

test("an admin adds rules, puts them in order and tries a page against them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInToInbox(page, "ada@example.com");
  await page.goto(SETTINGS);
  await expect(page.getByRole("heading", { name: "Contextual help" })).toBeVisible();

  await addRule(page, {
    name: BOOKINGS,
    match: "URL matches",
    value: `/bookings-${RUN}/*`,
    tags: TAG,
  });
  await addRule(page, {
    name: CHECKOUT,
    match: "URL contains",
    value: `checkout-${RUN}`,
    search: "payment failed",
  });

  const table = page.getByRole("table", { name: "Rules" });
  await expect(table.getByRole("row", { name: new RegExp(BOOKINGS) })).toContainText(
    `Tags any of ${TAG}`,
  );
  await expect(table.getByRole("row", { name: new RegExp(CHECKOUT) })).toContainText(
    "Search “payment failed”",
  );

  // The newer rule goes last; moving it up a place puts it before the other.
  await table.getByRole("button", { name: `Reorder ${CHECKOUT}` }).focus();
  await page.keyboard.press("Space");
  const announcement = page.locator('[id^="DndLiveRegion"]').first();
  await expect(announcement).toHaveText(new RegExp(`^Picked up ${CHECKOUT}`));
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowUp");
  await expect(announcement).toHaveText(new RegExp(`^${CHECKOUT} moved to position`));
  await page.keyboard.press("Space");
  await expect(announcement).toHaveText(new RegExp(`^${CHECKOUT} dropped`));
  await expect
    .poll(async () => {
      const { data } = await database
        .from("help_rules")
        .select("name")
        .like("name", `%${RUN}%`)
        .order("position");
      return data?.map((row) => row.name);
    })
    .toEqual([CHECKOUT, BOOKINGS]);

  // The test box says which rule matched and lists what the chat would show.
  await page.getByLabel("Page address").fill(`https://app.example.com/bookings-${RUN}/42`);
  await page.getByRole("button", { name: "Try it" }).click();
  const result = page.getByRole("region", { name: "Test result" });
  await expect(result).toContainText(`Rule “${BOOKINGS}” matched.`);
  await expect(result.getByRole("link", { name: `How refunds work ${RUN}` })).toBeVisible();

  // Switched off, the rule is skipped.
  await table.getByRole("switch", { name: `${BOOKINGS} is on` }).click();
  await expect(table.getByRole("switch", { name: `${BOOKINGS} is on` })).not.toBeChecked();
  await page.getByRole("button", { name: "Try it" }).click();
  await expect(result).toContainText("No rule matched.");

  // An agent reads the rules and tries pages, but cannot change them.
  await page.context().clearCookies();
  await signInToInbox(page, "sam@example.com");
  await page.goto(SETTINGS);
  await expect(page.getByRole("note")).toContainText("Only admins can change these.");
  await expect(page.getByRole("table", { name: "Rules" }).getByText(CHECKOUT)).toBeVisible();
  await expect(page.getByRole("button", { name: "New rule" })).toHaveCount(0);
});

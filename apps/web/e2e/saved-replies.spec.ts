import { expect, test } from "@playwright/test";

import { RUN, database, removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data, which has a "Greeting" reply (/hi)
// and where Ada is an admin.
const TITLE = "Delivery days E2E";
const SHORTCUT = `delivery-${RUN}`;
const VISITOR = { name: `Lena Novak ${RUN}`, email: `lena.${RUN}@example.org` };

async function cleanUp() {
  await database.from("saved_replies").delete().like("title", "Delivery days E2E%");
  await removeContactByEmail(VISITOR.email);
}

test.beforeEach(cleanUp);
test.afterEach(cleanUp);

test("an agent puts a saved reply into a reply with /, with its placeholders filled", async ({
  page,
}) => {
  // A visitor who has written, made directly in the database.
  const created = await database.auth.admin.createUser({
    email: VISITOR.email,
    email_confirm: true,
  });
  if (!created.data.user) throw created.error ?? new Error("The visitor was not made.");
  const { data: conversationId, error } = await database.rpc("start_conversation", {
    contact_id: created.data.user.id,
    body: "Hello, is anyone there?",
    source: "web",
    contact_name: VISITOR.name,
    contact_email: VISITOR.email,
  });
  if (error) throw error;

  await signInToInbox(page, "sam@example.com");
  await page.goto(`/dashboard/inbox?view=all&c=${conversationId}`);
  const reply = page.getByRole("textbox", { name: "Your message" });
  await expect(page.getByRole("log", { name: "Messages" })).toContainText("is anyone there?");

  await reply.pressSequentially("/gree");
  const options = page.getByRole("listbox", { name: "Saved replies" });
  await expect(options.getByRole("option", { name: /Greeting/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await reply.press("Enter");

  await expect(reply).toHaveValue(/^Hi Lena, thanks for getting in touch! I'm Sam from /);
  await expect(options).toHaveCount(0);

  // It can be changed before it goes, then sent like any reply.
  await reply.press("End");
  await reply.pressSequentially(" Today?");
  await reply.press("Enter");
  await expect(page.getByRole("log", { name: "Messages" })).toContainText(
    "Hi Lena, thanks for getting in touch!",
  );
});

test("an agent writes a saved reply in Settings and changes it", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/saved-replies");

  await page.getByRole("button", { name: "New reply" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New saved reply" });
  await dialog.getByLabel("Title").fill(TITLE);
  await dialog.getByLabel("Shortcut").fill(SHORTCUT);
  await dialog.getByLabel("Reply").fill("Hi ");
  await dialog.getByRole("button", { name: "Add contact's first name" }).click();
  await expect(dialog.getByLabel("Reply")).toHaveValue("Hi {contact.first_name}");
  await expect(dialog.getByLabel("Reply")).toBeFocused();
  await dialog.getByLabel("Reply").press("End");
  await dialog.getByLabel("Reply").pressSequentially(", we deliver Monday to Saturday.");
  // The preview fills the placeholders with made-up values.
  await expect(dialog.getByText("Hi Jordan, we deliver Monday to Saturday.")).toBeVisible();
  await dialog.getByRole("button", { name: "Save reply" }).click();

  const table = page.getByRole("table", { name: "Saved replies" });
  const row = table.getByRole("row").filter({ hasText: TITLE });
  await expect(row).toContainText(`/${SHORTCUT}`);
  await expect(row).toContainText("You");

  await row.getByRole("button", { name: `Edit, ${TITLE}` }).click();
  const editor = page.getByRole("dialog", { name: "Edit saved reply" });
  await editor.getByLabel("Title").fill(`${TITLE} (weekdays)`);
  await editor.getByText("Only me").click();
  await editor.getByRole("button", { name: "Save changes" }).click();

  const changed = table.getByRole("row").filter({ hasText: `${TITLE} (weekdays)` });
  await expect(changed).toContainText("Only you");

  await changed.getByRole("button", { name: `Delete, ${TITLE} (weekdays)` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete reply" }).click();
  await expect(changed).toHaveCount(0);
});

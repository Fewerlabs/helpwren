import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data, where Ada is an admin and Sam is
// an agent, and guests are asked for a name and an email or phone number.
const NEW_MEMBER = { name: "Kofi Mensah", email: "kofi.e2e@example.com" };

async function restore() {
  await database.from("settings").delete().eq("key", "allowed_domains");
  await database
    .from("settings")
    .update({ value: { name: "Helpwren Demo" } })
    .eq("key", "brand");
  await database.from("settings").update({ value: "email_or_phone" }).eq("key", "guest_details");
  const { data } = await database.from("agents").select("user_id").eq("email", NEW_MEMBER.email);
  for (const { user_id } of data ?? []) await database.auth.admin.deleteUser(user_id);
}

test.beforeEach(restore);
test.afterEach(restore);

test("an admin changes what the chat is called and what it asks guests", async ({
  page,
  browser,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\/general$/);

  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();

  await page.getByLabel("Brand name").fill("Acme Support");
  await page.getByRole("combobox", { name: "Ask guests for" }).click();
  await page.getByRole("option", { name: "Nothing" }).click();
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  // A visitor opening the chat now sees the new name, and is asked for nothing.
  const visitor = await browser.newContext();
  const chat = await visitor.newPage();
  await chat.goto("/embed");
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await expect(chat.getByText("Acme Support will reply here.")).toBeVisible();
  await expect(chat.getByLabel("Your name")).toHaveCount(0);
  await visitor.close();

  // The change is still there after a reload.
  await page.reload();
  await expect(page.getByLabel("Brand name")).toHaveValue("Acme Support");
});

test("an admin sets which sites may show the chat, and copies the snippet", async ({ page }) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/installation");

  await expect(
    page.getByText('<script src="http://localhost:3000/widget.js"></script>'),
  ).toBeVisible();
  await expect(page.getByText("any site can show your chat")).toBeVisible();

  const domains = page.getByLabel("Domains");
  await domains.fill("https://Example.com/pricing");
  await domains.press("Enter");
  await expect(page.getByRole("button", { name: "Remove example.com" })).toBeVisible();
  await expect(page.getByText("any site can show your chat")).toHaveCount(0);

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const { data } = await database
    .from("settings")
    .select("value")
    .eq("key", "allowed_domains")
    .single();
  expect(data?.value).toEqual(["example.com"]);
});

test("an admin adds a team member, changes their role and deactivates them", async ({ page }) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/team");
  const team = page.getByRole("list", { name: "Team members" });
  await expect(team.getByRole("listitem")).toHaveCount(2);
  // An admin has no controls for their own access.
  await expect(page.getByRole("button", { name: /Ada Okafor/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Add team member" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a team member" });
  await dialog.getByLabel("Name").fill(NEW_MEMBER.name);
  await dialog.getByLabel("Work email").fill(NEW_MEMBER.email);
  await dialog.getByRole("button", { name: "Add to team" }).click();

  const row = team.getByRole("listitem").filter({ hasText: NEW_MEMBER.name });
  await expect(row).toContainText("Agent");

  await page.getByRole("button", { name: `Make ${NEW_MEMBER.name} an admin` }).click();
  await expect(row).toContainText("Admin");

  await page.getByRole("button", { name: `Deactivate ${NEW_MEMBER.name}` }).click();
  await expect(row).toContainText("Deactivated");
  await expect(page.getByRole("button", { name: `Reactivate ${NEW_MEMBER.name}` })).toBeVisible();
});

test("an agent who is not an admin can read settings and change nothing", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/general");

  await expect(page.getByRole("note")).toContainText("Only admins can change these.");
  await expect(page.getByLabel("Brand name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);

  await page.getByRole("link", { name: "Team" }).click();
  await expect(page.getByRole("list", { name: "Team members" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add team member" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Deactivate/ })).toHaveCount(0);
});

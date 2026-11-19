import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// An admin turns on push notifications from Settings > Mobile. Runs against the local Supabase
// stack, where Ada is an admin and Sam is an agent.
async function restore() {
  await database.from("settings").delete().eq("key", "push");
  await database.from("secrets").delete().eq("key", "expo_access_token");
}

test.beforeEach(restore);
test.afterEach(restore);

test("an admin turns on Expo pushes, saves an access token without seeing it again, and removes it", async ({
  page,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/mobile");

  await page.getByRole("radio", { name: "Expo" }).click();
  await expect(page.getByText("No token")).toBeVisible();
  await page.getByLabel("Access token").fill("expo-robot-token-for-tests");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  // Kept as a secret, and never put back on the page.
  await expect(page.getByText("Token saved")).toBeVisible();
  await expect(page.getByLabel("Replace the access token")).toHaveValue("");
  await expect(page.locator("body")).not.toContainText("expo-robot-token-for-tests");
  const { data: secret } = await database
    .from("secrets")
    .select("value")
    .eq("key", "expo_access_token")
    .single();
  expect(secret?.value).toBe("expo-robot-token-for-tests");
  const { data: setting } = await database
    .from("settings")
    .select("value, is_public")
    .eq("key", "push")
    .single();
  expect(setting).toEqual({ value: { provider: "expo" }, is_public: false });

  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Remove token" }).click();
  await expect(page.getByText("No token")).toBeVisible();
});

test("an agent who is not an admin sees the push settings, and changes nothing", async ({
  page,
}) => {
  await database.from("settings").upsert({ key: "push", value: { provider: "expo" } });
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/mobile");

  await expect(page.getByText("Only admins can change these.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Expo" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);
});

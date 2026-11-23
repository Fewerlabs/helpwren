import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";
import { startSmtpCatcher, type SmtpCatcher } from "./support/smtp-catcher";

// The local setup sets no email provider on the server, so an admin can choose one in
// Settings → Email. A small SMTP server in the test stands in for the mail provider.
let catcher: SmtpCatcher;
const PASSWORD = "abc#ix/(1)?";

test.beforeAll(async () => {
  catcher = await startSmtpCatcher();
});
test.afterAll(async () => {
  await database.from("secrets").delete().eq("key", "email_provider");
  await catcher.close();
});

test("an admin enters an SMTP server in Settings, with a password as it is, and sends a test", async ({
  page,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/email");
  await expect(page.getByText("Not set up")).toBeVisible();

  await page.getByLabel("SMTP server").fill("127.0.0.1");
  await page.getByLabel("Port").fill(String(catcher.port));
  await page.getByLabel("Username").fill("support@acme.example");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("From address").fill("support@acme.example");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  // It sends through that server at once, signed in with the password exactly as typed.
  await expect(page.locator('[data-slot="badge"][data-variant="accent"]')).toHaveText("SMTP");
  await page.getByRole("button", { name: "Send a test email" }).click();
  await expect(page.getByText("Test email sent to ada@example.com")).toBeVisible();
  await expect.poll(() => catcher.emails.length).toBe(1);
  expect(catcher.emails[0]).toMatchObject({
    user: "support@acme.example",
    password: PASSWORD,
    to: ["<ada@example.com>"],
  });

  // The password never comes back to the page; leaving it empty keeps it.
  await page.reload();
  await expect(page.getByLabel("SMTP server")).toHaveValue("127.0.0.1");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByText("Saved. Leave empty to keep it.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(PASSWORD);
  await page.getByLabel("From name").fill("Acme Support");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.getByRole("button", { name: "Send a test email" }).click();
  await expect.poll(() => catcher.emails.length).toBe(2);
  expect(catcher.emails[1]?.password).toBe(PASSWORD);

  // Clearing the server removes it.
  await page.getByLabel("SMTP server").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Not set up")).toBeVisible();
});

test("an admin chooses Resend in Settings, and its key is kept out of sight", async ({ page }) => {
  const KEY = "re_test_key_never_shown";
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/email");
  const sending = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Sending", exact: true }) });

  await sending.getByRole("combobox", { name: "Provider" }).click();
  await page.getByRole("option", { name: "Resend" }).click();
  await expect(sending.getByLabel("SMTP server")).toHaveCount(0);
  await sending.getByLabel("API key", { exact: true }).fill(KEY);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  await page.reload();
  await expect(sending.locator('[data-slot="badge"][data-variant="accent"]')).toHaveText("Resend");
  await expect(sending.getByLabel("API key", { exact: true })).toHaveValue("");
  await expect(sending.getByText("Saved. Leave empty to keep it.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(KEY);
  const { data } = await database
    .from("secrets")
    .select("value")
    .eq("key", "email_provider")
    .single();
  expect(data?.value).toEqual({ provider: "resend", apiKey: KEY });
});

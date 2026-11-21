import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";
import { startSmtpCatcher, type SmtpCatcher } from "./support/smtp-catcher";

// The local setup sets no email provider on the server, so an admin can enter an SMTP server
// in Settings → Email. A small SMTP server in the test stands in for the mail provider.
let catcher: SmtpCatcher;
const PASSWORD = "abc#ix/(1)?";

test.beforeAll(async () => {
  catcher = await startSmtpCatcher();
});
test.afterAll(async () => {
  await database.from("secrets").delete().eq("key", "smtp_server");
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
  await page.getByLabel("Username").fill("support@glown.example");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("From address").fill("support@acme.example");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  // It sends through that server at once, signed in with the password exactly as typed.
  await expect(page.getByText("SMTP", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send a test email" }).click();
  await expect(page.getByText("Test email sent to ada@example.com")).toBeVisible();
  await expect.poll(() => catcher.emails.length).toBe(1);
  expect(catcher.emails[0]).toMatchObject({
    user: "support@glown.example",
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

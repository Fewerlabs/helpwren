import { expect, test } from "@playwright/test";

import { countEmails, emptyMailbox, readSignInCode } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data: `pnpm db:start`, then `pnpm db:env`.
const AGENT = { email: "sam@example.com", name: "Sam Rivera" };

test.beforeEach(async ({ request }) => {
  // Empty the mailbox, so the code found is the one this test asked for.
  await emptyMailbox(request);
});

test("a team member signs in with an emailed code and signs out", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Work email").fill(AGENT.email);
  await page.getByRole("button", { name: "Email me a code" }).click();

  const codeField = page.getByLabel("Sign-in code");
  // A box for each digit, and the last digit sends the form without pressing anything.
  await expect(page.locator("[data-slot='otp-input'] > div")).toHaveCount(6);
  await codeField.fill("000000");
  await expect(page.getByText("That code is wrong or out of date.")).toBeVisible();

  await codeField.fill(await readSignInCode(request, AGENT.email));

  await expect(page).toHaveURL(/\/dashboard\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();

  await page.goto("/login");
  await expect(page, "someone signed in skips the sign-in page").toHaveURL(/\/dashboard\/inbox$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dashboard");
  await expect(page, "the inbox is closed again after signing out").toHaveURL(/\/login$/);
});

test("an email that is not on the team gets the same answer and no code", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("nobody@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();

  await expect(page.getByLabel("Sign-in code")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("If nobody@example.com is on the team");

  expect(await countEmails(request)).toBe(0);
});

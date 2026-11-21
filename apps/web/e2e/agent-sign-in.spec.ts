import { expect, test } from "@playwright/test";

import { database, newTeamMember, uniqueEmail } from "./support/database";
import { countNewEmails, markMailbox, readSignInCode } from "./support/mailbox";

// Runs against the local Supabase stack: `pnpm db:start`, then `pnpm db:env`. The team member is
// one of the test's own, so nobody else signing in at the same time can replace their code.
let agent: Awaited<ReturnType<typeof newTeamMember>>;

test.beforeAll(async () => {
  agent = await newTeamMember("Rosa Signin");
});

test.afterAll(async () => {
  await agent.remove();
});

test("a team member signs in with an emailed code and signs out", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  const mark = await markMailbox(request, agent.email);
  await page.getByLabel("Work email").fill(agent.email);
  await page.getByRole("button", { name: "Email me a code" }).click();

  const codeField = page.getByLabel("Sign-in code");
  // A box for each digit, and the last digit sends the form without pressing anything.
  await expect(page.locator("[data-slot='otp-input'] > div")).toHaveCount(6);
  await codeField.fill("000000");
  await expect(page.getByText("That code is wrong or out of date.")).toBeVisible();

  await codeField.fill(await readSignInCode(request, mark));

  await expect(page).toHaveURL(/\/dashboard\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();

  await page.goto("/login");
  await expect(page, "someone signed in skips the sign-in page").toHaveURL(/\/dashboard\/inbox$/);

  // Signing out is in the menu behind their avatar.
  await page.getByRole("button", { name: /^Your account/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dashboard");
  await expect(page, "the inbox is closed again after signing out").toHaveURL(/\/login$/);
});

test("an email that is not on the team gets the same answer and no code", async ({
  page,
  request,
}) => {
  const nobody = uniqueEmail("nobody");
  const mark = await markMailbox(request, nobody);
  await page.goto("/login");
  await page.getByLabel("Work email").fill(nobody);
  await page.getByRole("button", { name: "Email me a code" }).click();

  await expect(page.getByLabel("Sign-in code")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(`If ${nobody} is on the team`);

  expect(await countNewEmails(request, mark)).toBe(0);
});

test("a team member signs in with a password an admin set for them", async ({ page }) => {
  const password = "rosa-signin-pass";
  const { error } = await database.auth.admin.updateUserById(agent.id, { password });
  if (error) throw error;

  await page.goto("/login");
  await page.getByLabel("Work email").fill(agent.email);
  await page.getByLabel(/^Password/).fill("not-her-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("That email and password do not match.")).toBeVisible();

  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/inbox$/);
});

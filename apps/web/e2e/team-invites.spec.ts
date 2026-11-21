import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

import { database, RUN, uniqueEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";
import { startSmtpCatcher, type SmtpCatcher } from "./support/smtp-catcher";

// Each test invites someone of its own, with an address no other run uses, and removes them.
const invited: string[] = [];

test.afterEach(async () => {
  for (const email of invited.splice(0)) {
    const { data } = await database.from("agents").select("user_id").eq("email", email);
    for (const { user_id } of data ?? []) await database.auth.admin.deleteUser(user_id);
  }
});

function newMember(label: string) {
  const member = { name: `${label} ${RUN}`, email: uniqueEmail(label.toLowerCase()) };
  invited.push(member.email);
  return member;
}

/** Signs Ada, an admin, in and opens the invite dialog with the member's details filled in. */
async function startInvite(page: Page, member: { name: string; email: string }) {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/team");
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Invite a team member" });
  await dialog.getByLabel("Name").fill(member.name);
  await dialog.getByLabel("Work email").fill(member.email);
  return dialog;
}

/** The value a dialog shows once, to copy. */
async function shownValue(dialog: Locator): Promise<string> {
  return ((await dialog.locator("[data-slot='code-snippet'] code").textContent()) ?? "").trim();
}

/** Opens an invite link in a browser of its own, chooses a password, and lands in the inbox. */
async function accept(browser: Browser, link: string, member: { email: string }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(link);
  await expect(page.getByRole("heading", { name: /^Join / })).toBeVisible();
  await expect(page.getByText(member.email)).toBeVisible();
  await page.getByLabel(/^New password/).fill("my-own-password-1");
  await page.getByLabel(/^Type it again/).fill("my-own-password-1");
  await page.getByRole("button", { name: "Set your password" }).click();
  await expect(page).toHaveURL(/\/dashboard\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  return { context, page };
}

test("an admin copies an invite link, and the new member joins with it once", async ({
  page,
  browser,
}) => {
  const member = newMember("Lena");
  const dialog = await startInvite(page, member);
  // The local setup has no email provider, so a link is the way in it offers first.
  await expect(dialog.getByRole("radio", { name: /Email an invite/ })).toBeDisabled();
  await expect(dialog.getByRole("radio", { name: /Copy a link/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Create link" }).click();

  const shown = page.getByRole("dialog", { name: `Invite link for ${member.name}` });
  const link = await shownValue(shown);
  expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);
  await shown.getByRole("button", { name: "Done" }).click();
  const row = page
    .getByRole("list", { name: "Team members" })
    .getByRole("listitem")
    .filter({ hasText: member.name });
  await expect(row).toContainText("Invited");

  const joined = await accept(browser, link, member);
  // The link is used up.
  await joined.page.goto(link);
  await expect(joined.page.getByRole("heading", { name: "This invite has expired" })).toBeVisible();
  await expect(joined.page.getByText("Ask an admin for a new one.")).toBeVisible();
  await joined.context.close();

  await page.reload();
  await expect(row).not.toContainText("Invited");
});

test("a link that is unknown says only that it has expired", async ({ page }) => {
  await page.goto(`/invite/${"A".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "This invite has expired" })).toBeVisible();
  await expect(page.getByLabel(/^New password/)).toHaveCount(0);
});

test("a member given a temporary password signs in and must choose their own", async ({
  page,
  browser,
}) => {
  const member = newMember("Omar");
  const dialog = await startInvite(page, member);
  await dialog.getByText("Temporary password", { exact: true }).click();
  await expect(dialog.getByRole("radio", { name: /Temporary password/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Create password" }).click();

  const shown = page.getByRole("dialog", { name: `Temporary password for ${member.name}` });
  const temporary = await shownValue(shown);
  expect(temporary).toMatch(/^([a-z]+-){4}\d{2}$/);
  await shown.getByRole("button", { name: "Done" }).click();

  const context = await browser.newContext();
  const theirs = await context.newPage();
  await theirs.goto("/login");
  await theirs.getByLabel("Work email").fill(member.email);
  await theirs.getByLabel(/^Password/).fill(temporary);
  await theirs.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(theirs).toHaveURL(/\/choose-password$/);
  await expect(theirs.getByRole("heading", { name: "Choose your password" })).toBeVisible();

  // Every dashboard page sends them back here until they have.
  await theirs.goto("/dashboard/settings/profile");
  await expect(theirs).toHaveURL(/\/choose-password$/);

  await theirs.getByLabel(/^New password/).fill(temporary);
  await theirs.getByLabel(/^Type it again/).fill(temporary);
  await theirs.getByRole("button", { name: "Save and continue" }).click();
  await expect(theirs.getByText("That is already your password.")).toBeVisible();

  await theirs.getByLabel(/^New password/).fill("omar-own-password");
  await theirs.getByLabel(/^Type it again/).fill("omar-own-password");
  await theirs.getByRole("button", { name: "Save and continue" }).click();
  await expect(theirs).toHaveURL(/\/dashboard\/inbox$/);
  await theirs.goto("/choose-password");
  await expect(theirs).toHaveURL(/\/dashboard\/inbox$/);
  await context.close();
});

test.describe("by email", () => {
  // A small SMTP server in the test stands in for the mail provider, saved in Settings → Email.
  let catcher: SmtpCatcher;

  test.beforeAll(async () => {
    catcher = await startSmtpCatcher();
  });
  test.afterAll(async () => {
    await database.from("secrets").delete().eq("key", "email_provider");
    await catcher.close();
  });

  /** The words of an email as sent, with quoted-printable line breaks and escapes undone. */
  function decoded(data: string): string {
    return data
      .replace(/=\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }

  test("an admin emails an invite, and its link lets the member join", async ({
    page,
    browser,
  }) => {
    await signInToInbox(page, "ada@example.com");
    await page.goto("/dashboard/settings/email");
    await page.getByLabel("SMTP server").fill("127.0.0.1");
    await page.getByLabel("Port").fill(String(catcher.port));
    await page.getByLabel("From address").fill("support@acme.example");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

    const member = newMember("Priya");
    await page.goto("/dashboard/settings/team");
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Invite a team member" });
    await dialog.getByLabel("Name").fill(member.name);
    await dialog.getByLabel("Work email").fill(member.email);
    // With email set up, an emailed invite is the way in it offers first.
    await expect(dialog.getByRole("radio", { name: /Email an invite/ })).toBeChecked();
    await dialog.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(`Invite sent to ${member.email}`)).toBeVisible();

    await expect
      .poll(() => catcher.emails.filter((email) => email.to.includes(`<${member.email}>`)).length)
      .toBe(1);
    const email = decoded(
      catcher.emails.find((caught) => caught.to.includes(`<${member.email}>`))?.data ?? "",
    );
    expect(email).toContain("invited you to");
    expect(email).toContain("Set your password");
    const link = /https?:\/\/[^\s"<>]+\/invite\/[A-Za-z0-9_-]{43}/.exec(email)?.[0] ?? "";
    expect(link).not.toBe("");

    const joined = await accept(browser, link, member);
    await joined.context.close();
  });
});

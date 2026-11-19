import { expect, test } from "@playwright/test";

import { database, removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data, which asks guests for a name and an
// email or phone number.
const SPAMMER = { name: "Spam Robotson", email: "spam.e2e@example.org" };

test.beforeEach(async () => {
  await removeContactByEmail(SPAMMER.email);
});
test.afterEach(async () => {
  await removeContactByEmail(SPAMMER.email);
});

test("pages say who may frame them and that files are what they say", async ({ request }) => {
  const login = await request.get("/login");
  expect(login.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(login.headers()["content-security-policy"]).toContain("object-src 'none'");
  expect(login.headers()["x-content-type-options"]).toBe("nosniff");

  const help = await request.get("/help");
  expect(help.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
});

test("a team member blocks a contact, who can then no longer write, and unblocks them", async ({
  page,
  browser,
}) => {
  // The visitor starts a conversation, and tries to send a page of HTML dressed as a picture.
  await page.goto("/embed");
  await page.getByRole("button", { name: "Send us a message" }).click();
  await page.getByLabel("Your name").fill(SPAMMER.name);
  await page.getByRole("textbox", { name: "Email" }).fill(SPAMMER.email);
  await page.getByLabel("Your message").fill("Is anyone reading this?");
  await page.getByRole("button", { name: "Send message" }).click();
  const messages = page.getByRole("log", { name: "Messages" });
  await expect(messages.getByText("Is anyone reading this?")).toBeVisible();

  await page.getByLabel("Files to attach").setInputFiles({
    name: "cat.png",
    mimeType: "image/png",
    buffer: Buffer.from("<html><script>alert(1)</script></html>"),
  });
  await expect(page.getByText(/That kind of file cannot be sent/)).toBeVisible();

  // The team blocks them from their contact page.
  const team = await browser.newContext();
  const inbox = await team.newPage();
  await signInToInbox(inbox, "sam@example.com");
  await inbox.goto("/dashboard/contacts");
  await inbox.getByRole("searchbox", { name: "Search contacts" }).fill(SPAMMER.email);
  await inbox
    .getByRole("table", { name: "Contacts" })
    .getByRole("button", { name: SPAMMER.name })
    .click();
  const details = inbox.getByRole("region", { name: "Contact" });
  await details.getByRole("button", { name: "Block", exact: true }).click();
  await inbox.getByRole("alertdialog").getByRole("button", { name: "Block" }).click();
  await expect(details.getByText(/Blocked since/)).toBeVisible();

  // Their next message is refused, and they are told why.
  await page.getByLabel("Your message").fill("Let me back in");
  await page.getByLabel("Your message").press("Enter");
  await expect(page.getByText("You can no longer send messages here.")).toBeVisible();

  // Unblocked, they write again, and both are in the audit log.
  await details.getByRole("button", { name: "Unblock" }).click();
  await expect(details.getByRole("button", { name: "Block", exact: true })).toBeVisible();
  await page.getByLabel("Your message").fill("Sorry about that");
  await page.getByLabel("Your message").press("Enter");
  await expect(messages.getByText("Sorry about that")).toBeVisible();

  const { data: contact } = await database
    .from("contacts")
    .select("id")
    .eq("email", SPAMMER.email)
    .single();
  const { data: audit } = await database
    .from("audit_events")
    .select("action")
    .eq("contact_id", contact?.id ?? "")
    .order("created_at");
  expect(audit?.map((event) => event.action)).toEqual(["contact_blocked", "contact_unblocked"]);
  await team.close();
});

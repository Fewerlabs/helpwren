import { expect, test } from "@playwright/test";

import { removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A visitor and a team member, each in their own browser, talking to each other. Runs against
// the local Supabase stack and its demo data.
const VISITOR = { name: "Noor Haddad", email: "noor.e2e@example.org" };
const AGENT = "sam@example.com";

test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});
test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
});

test("a visitor and a team member hold a conversation, live on both sides", async ({ browser }) => {
  const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const inbox = await agentContext.newPage();
  const chat = await visitorContext.newPage();

  await signInToInbox(inbox, AGENT);
  const list = inbox.getByRole("list", { name: "Conversations" });
  await expect(list.getByRole("listitem").first()).toBeVisible();

  // The visitor writes. The conversation appears in the inbox without a reload.
  await chat.goto("/embed");
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(VISITOR.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await chat.getByLabel("Your message").fill("Can I change my delivery address?");
  await chat.getByRole("button", { name: "Send message" }).click();

  const row = list.getByRole("button", { name: new RegExp(VISITOR.name) });
  await expect(row).toContainText("Can I change my delivery address?");
  await expect(row).toContainText("1 unread");

  // The team member opens it: the message, who it is from, and where they wrote from.
  await row.click();
  await expect(inbox).toHaveURL(/\/inbox\?c=/);
  const agentMessages = inbox.getByRole("log", { name: "Messages" });
  await expect(agentMessages.getByText("Can I change my delivery address?")).toBeVisible();
  const details = inbox.getByRole("region", { name: "Details" });
  await expect(details.getByRole("link", { name: VISITOR.email })).toBeVisible();
  await expect(details.getByText("Guest")).toBeVisible();
  // Opening it marks it as read.
  await expect(row).not.toContainText("unread");

  // The reply reaches the visitor live.
  const reply = inbox.getByRole("textbox", { name: "Your message" });
  await reply.fill("Yes. What is the new address?");
  await reply.press("Enter");
  const visitorMessages = chat.getByRole("log", { name: "Messages" });
  await expect(visitorMessages.getByText("Yes. What is the new address?")).toBeVisible();

  // And the visitor's answer reaches the team member live.
  const answer = chat.getByRole("textbox", { name: "Your message" });
  await answer.fill("12 Harbour Road, please.");
  await answer.press("Enter");
  await expect(agentMessages.getByText("12 Harbour Road, please.")).toBeVisible();
  await expect(row).toContainText("12 Harbour Road, please.");

  // A reload lands on the same conversation, because it is in the address.
  await inbox.reload();
  await expect(agentMessages.getByText("12 Harbour Road, please.")).toBeVisible();

  await agentContext.close();
  await visitorContext.close();
});

test("the inbox can show every conversation, not only open ones", async ({ page }) => {
  await signInToInbox(page, AGENT);
  const list = page.getByRole("list", { name: "Conversations" });
  await expect(list.getByText("Do you offer a discount for charities?")).toBeVisible();
  await expect(list.getByText("All sorted. Thanks for the quick reply!")).toHaveCount(0);

  const views = page.getByRole("navigation", { name: "Inbox views" });
  await expect(views.getByRole("link", { name: /Open/ })).toHaveAttribute("aria-current", "page");
  await views.getByRole("link", { name: /All/ }).click();
  await expect(page).toHaveURL(/view=all/);
  await expect(list.getByText("All sorted. Thanks for the quick reply!")).toBeVisible();
  await expect(list.getByText("Resolved")).toBeVisible();
});

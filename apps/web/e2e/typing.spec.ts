import { expect, test, type Browser } from "@playwright/test";

import { RUN, removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A visitor and a team member, each in their own browser, seeing each other type. Runs against
// the local Supabase stack, Realtime included, and its demo data.
const VISITOR = { name: `Tomas Berg ${RUN}`, email: `tomas.${RUN}@example.org` };
const AGENT = "sam@example.com";

test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});
test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
});

/** A visitor who has written, and a team member with their conversation open. */
async function openConversation(browser: Browser) {
  const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const visitorContext = await browser.newContext({ viewport: { width: 375, height: 780 } });
  const inbox = await agentContext.newPage();
  const chat = await visitorContext.newPage();

  await signInToInbox(inbox, AGENT);
  await chat.goto("/embed");
  // With the inbox open, the team counts as online.
  await expect(chat.getByText("We’re online")).toBeVisible();
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(VISITOR.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await chat.getByLabel("Your message").fill("Do you deliver on Sundays?");
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(
    "Do you deliver on Sundays?",
  );

  const list = inbox.getByRole("list", { name: "Conversations" });
  await list.getByRole("button", { name: new RegExp(VISITOR.name) }).click();
  await expect(inbox.getByRole("log", { name: "Messages" })).toContainText(
    "Do you deliver on Sundays?",
  );
  return { inbox, chat, contexts: [agentContext, visitorContext] };
}

test("the visitor sees the team member typing, until the reply arrives", async ({ browser }) => {
  const { inbox, chat, contexts } = await openConversation(browser);

  const reply = inbox.getByRole("textbox", { name: "Your message" });
  await reply.pressSequentially("Yes, between ten and four");
  const typing = chat.getByRole("status").filter({ hasText: "is typing" });
  await expect(typing).toHaveText(/Sam Rivera is typing…/);

  await reply.press("Enter");
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(
    "Yes, between ten and four",
  );
  await expect(typing).toHaveCount(0);

  // A note is for the team: writing one shows nothing to the visitor.
  await inbox.getByRole("button", { name: "Note", exact: true }).click();
  await inbox.getByRole("textbox", { name: "Your note" }).pressSequentially("Check the depot");
  await chat.waitForTimeout(1500);
  await expect(typing).toHaveCount(0);

  await Promise.all(contexts.map((context) => context.close()));
});

test("the team member sees the visitor typing", async ({ browser }) => {
  const { inbox, chat, contexts } = await openConversation(browser);

  await chat.getByRole("textbox", { name: "Your message" }).pressSequentially("And on holidays");
  await expect(inbox.getByRole("status").filter({ hasText: "is typing" })).toHaveText(
    new RegExp(`${VISITOR.name} is typing…`),
  );

  await Promise.all(contexts.map((context) => context.close()));
});

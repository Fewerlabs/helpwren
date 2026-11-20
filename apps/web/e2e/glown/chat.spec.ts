import { expect, test } from "@playwright/test";

import { database, RUN, uniqueEmail } from "../support/database";
import { signInToInbox } from "../support/mailbox";
import {
  AGENT,
  chatOf,
  contactOf,
  DEMO_AGENT_ID,
  newGlownUser,
  removePeople,
  signUp,
  SITE,
  setUpGlownInstall,
  WEB_APP,
  writeAsGuest,
  writeAsUser,
} from "./support/glown";

// Glown's public site and web app (examples/nextjs, on two hostnames of one site) with this
// install as their Helpwren, set up the way Glown's is. A team member answers from the
// dashboard of the install.
setUpGlownInstall();

const made: string[] = [];
test.afterEach(async () => {
  await removePeople(made.splice(0));
});

test("a guest chats on the public site, and the team's reply from the dashboard arrives live", async ({
  browser,
}) => {
  const guest = { name: `Zara Bello ${RUN}`, email: uniqueEmail("zara") };
  made.push(guest.email);
  const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const inbox = await agentContext.newPage();
  await signInToInbox(inbox, AGENT);

  // The widget comes from the install's own script tag on glown.io, in Glown's colours.
  const site = await (await browser.newContext()).newPage();
  await site.goto(SITE);
  const launcher = site.getByRole("button", { name: "Open chat" });
  await launcher.click();
  const chat = chatOf(site);
  await expect(chat.getByRole("button", { name: "Send us a message" })).toBeVisible();
  await writeAsGuest(chat, guest, "Do you have salons in Lekki?");

  const row = inbox
    .getByRole("list", { name: "Conversations" })
    .getByRole("button", { name: new RegExp(guest.name) });
  await expect(row).toContainText("Do you have salons in Lekki?");
  await row.click();
  const details = inbox.getByRole("region", { name: "Details" });
  await expect(details.getByText("Guest")).toBeVisible();
  await expect(details.getByText("web", { exact: true })).toBeVisible();

  const reply = inbox.getByRole("textbox", { name: "Your message" });
  await reply.fill("Yes, more than forty. Which service are you after?");
  await reply.press("Enter");
  await expect(
    chat.getByRole("log", { name: "Messages" }).getByText("Yes, more than forty."),
  ).toBeVisible();

  await agentContext.close();
  await site.context().close();
});

test("a page with its own Help button hides the launcher and opens the chat itself", async ({
  page,
}) => {
  await page.goto(`${SITE}/business`);
  const chat = chatOf(page);
  // The widget is on the page, waiting to be opened, with no round button of its own.
  await expect(page.locator("iframe[title='Chat']")).toBeAttached();
  await expect(page.getByRole("button", { name: "Open chat" })).toHaveCount(0);
  await page.getByRole("button", { name: "Help" }).click();
  await expect(chat.getByRole("button", { name: "Send us a message" })).toBeVisible();
});

test("a button on the page starts a conversation with a draft, and sends nothing", async ({
  page,
}) => {
  await page.goto(`${SITE}/pricing`);
  await page.getByRole("button", { name: "Ask about Pro" }).click();
  const chat = chatOf(page);
  await expect(chat.getByLabel("Your message")).toHaveValue(
    "Hi! I'd like to know more about the Pro plan.",
  );
  // It is only in the box: nothing has been sent, so there is no conversation to show.
  await expect(chat.getByRole("log", { name: "Messages" })).toHaveCount(0);
  await expect(chat.getByLabel("Your name")).toBeVisible();
});

test("a reply the user has not read shows as a badge on the web app's own Help button", async ({
  page,
}) => {
  const user = newGlownUser("Kemi");
  made.push(user.email);
  await signUp(page, user);

  const help = page.getByRole("banner").getByRole("button", { name: /^Help/ });
  await help.click();
  const chat = chatOf(page);
  await writeAsUser(chat, "How do I add a second staff member?");
  await page.getByRole("button", { name: "Close chat" }).click();

  // The team replies while the chat is closed.
  const contact = await contactOf(user.email);
  const conversationId = contact?.conversations[0]?.id;
  if (!conversationId) throw new Error("The conversation was not saved.");
  await database.from("messages").insert({
    conversation_id: conversationId,
    sender_id: DEMO_AGENT_ID,
    sender_role: "agent",
    body: "Open Staff, then Add a member.",
  });
  await expect(help.getByLabel("1 unread")).toBeVisible();

  // Reading it clears the badge.
  await help.click();
  await chat.getByText("Open Staff, then Add a member.").first().click();
  await expect(
    chat.getByRole("log", { name: "Messages" }).getByText("Open Staff, then Add a member."),
  ).toBeVisible();
  await expect(help.getByLabel("1 unread")).toHaveCount(0);
  expect(new URL(page.url()).origin).toBe(WEB_APP);
});

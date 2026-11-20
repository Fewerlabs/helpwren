import { expect, test } from "@playwright/test";

import { newContact, removeContactByEmail, removeContacts, RUN } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A visitor and a team member, each in their own browser, talking to each other. Runs against
// the local Supabase stack and its demo data.
const VISITOR = { name: `Noor Haddad ${RUN}`, email: `noor.${RUN}@example.org` };
const AGENT = "sam@example.com";

const made: string[] = [];

test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});

test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
  await removeContacts(made.splice(0));
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
  await chat
    .getByLabel("Your message")
    .pressSequentially("Can I change my delivery address?", { delay: 10 });
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

  // A picture from the team, sent on its own, shows on the visitor's side.
  await inbox.getByLabel("Files to attach").setInputFiles({
    name: "label.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  const toSend = inbox.getByRole("list", { name: "Files to send" });
  await expect(toSend.getByText("label.png")).toBeVisible();
  await inbox.getByRole("button", { name: "Send" }).click();
  await expect(toSend).toHaveCount(0);
  await expect(visitorMessages.getByRole("img", { name: "label.png" })).toBeVisible();
  await expect(agentMessages.getByRole("img", { name: "label.png" })).toBeVisible();

  // A document from the visitor, with a few words, reaches the team as a link.
  await chat.getByLabel("Files to attach").setInputFiles({
    name: "address.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("12 Harbour Road"),
  });
  await expect(chat.getByRole("list", { name: "Files to send" })).toContainText("address.txt");
  await answer.fill("Here it is in writing.");
  // Sending waits for the upload: the button is off until the file is in.
  await expect(chat.getByRole("button", { name: "Send" })).toBeEnabled();
  await answer.press("Enter");
  await expect(agentMessages.getByText("Here it is in writing.")).toBeVisible();
  await expect(agentMessages.getByRole("link", { name: /address\.txt/ })).toHaveAttribute(
    "href",
    /\/storage\/v1\/object\/sign\/attachments\//,
  );
  // A kind of file that cannot be sent is refused before anything is uploaded.
  await chat.getByLabel("Files to attach").setInputFiles({
    name: "page.html",
    mimeType: "text/html",
    buffer: Buffer.from("<p>hi</p>"),
  });
  await expect(chat.getByText(/That kind of file cannot be sent/)).toBeVisible();

  // The team makes it a ticket. The visitor sees that, and where it stands, without reloading.
  await inbox.getByRole("button", { name: "Convert to ticket" }).click();
  const dialog = inbox.getByRole("dialog", { name: "Convert to ticket" });
  await dialog.getByLabel("Subject").fill("Change of delivery address");
  await dialog.getByRole("button", { name: "Convert to ticket" }).click();
  await expect(chat.getByText(/Ticket #\d{4}/)).toBeVisible();
  await expect(chat.getByText("Change of delivery address")).toBeVisible();
  await expect(visitorMessages.getByText(/This became ticket #\d{4}/)).toBeVisible();

  await inbox.getByRole("button", { name: "Resolve" }).click();
  await inbox
    .getByRole("alertdialog", { name: "Resolve this ticket?" })
    .getByRole("button", { name: "Resolve" })
    .click();
  await expect(visitorMessages.getByText("Marked as resolved")).toBeVisible();
  await expect(chat.getByText("Resolved", { exact: true })).toBeVisible();
  // Once it is resolved, the visitor is asked how it went, and the team sees the answer.
  const rate = chat.getByRole("form", { name: "Rate this conversation" });
  await rate.getByRole("radio", { name: /^4 out of 5/ }).click();
  await rate.getByRole("textbox", { name: "Anything to add?" }).fill("Quick and clear.");
  await rate.getByRole("button", { name: "Send rating" }).click();
  await expect(rate).toHaveCount(0);
  await expect(visitorMessages.getByText("You rated this 4 out of 5")).toBeVisible();
  await expect(agentMessages.getByText(`${VISITOR.name} rated this 4 out of 5`)).toBeVisible();
  const ratedDetails = inbox.getByRole("region", { name: "Details" });
  await expect(ratedDetails.getByText("4 out of 5")).toBeVisible();
  await expect(ratedDetails.getByText("“Quick and clear.”")).toBeVisible();

  // Who has the ticket, and how urgent the team thinks it is, stays with the team.
  await inbox.getByRole("button", { name: "Assign to me" }).click();
  await expect(agentMessages.getByText("Sam Rivera took this")).toBeVisible();
  await expect(visitorMessages.getByText(/took this|assigned/)).toHaveCount(0);

  // A reload lands on the same conversation, because it is in the address.
  await inbox.reload();
  await expect(agentMessages.getByText("12 Harbour Road, please.")).toBeVisible();

  await agentContext.close();
  await visitorContext.close();
});

test("the inbox shows what is open first, and other statuses from the switch on the list", async ({
  page,
}) => {
  // One open conversation and one resolved, both just now, so they lead the list.
  const OPEN = `Do you offer a discount for charities? ${RUN}`;
  const RESOLVED = `All sorted. Thanks for the quick reply! ${RUN}`;
  const people = await Promise.all([
    newContact({
      kind: "guest",
      name: `Open ${RUN}`,
      email: `open.${RUN}@example.org`,
      messages: [OPEN],
    }),
    newContact({
      kind: "guest",
      name: `Resolved ${RUN}`,
      email: `resolved.${RUN}@example.org`,
      messages: [RESOLVED],
      status: "resolved",
    }),
  ]);
  made.push(...people.map((person) => person.id));

  await signInToInbox(page, AGENT);
  const list = page.getByRole("list", { name: "Conversations" });
  await expect(list.getByText(OPEN)).toBeVisible();
  await expect(list.getByText(RESOLVED)).toHaveCount(0);

  // The navigation says whose conversations; everyone's, to begin with.
  const views = page.getByRole("navigation", { name: "Inbox views" });
  await expect(views.getByRole("link", { name: /^All/ })).toHaveAttribute("aria-current", "page");

  // The switch says which of them. It is kept in the address.
  const conversations = page.getByRole("region", { name: "Conversations" });
  await conversations.getByRole("button", { name: "Show: Open" }).click();
  await page.getByRole("option", { name: "Resolved" }).click();
  await expect(page).toHaveURL(/status=resolved/);
  await expect(list.getByText(RESOLVED)).toBeVisible();
  await expect(list.getByText(OPEN)).toHaveCount(0);

  await conversations.getByRole("button", { name: "Show: Resolved" }).click();
  await page.getByRole("option", { name: "All" }).click();
  await expect(list.getByText(OPEN)).toBeVisible();
  await expect(list.getByRole("listitem").filter({ hasText: RESOLVED })).toContainText("Resolved");

  // Another view starts on what is open again.
  await views.getByRole("link", { name: /Unassigned/ }).click();
  await expect(page).toHaveURL(/view=unassigned$/);
  await expect(conversations.getByRole("button", { name: "Show: Open" })).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A visitor on the chat page and a team member in the dashboard, each in a browser of their
// own. Runs against the local Supabase stack and its demo data.

type VisitorSetting = { tracking: boolean; liveList: boolean } | null;
let saved: VisitorSetting = null;
const visitorIds: string[] = [];

async function setVisitors(value: VisitorSetting) {
  await database.from("settings").delete().eq("key", "visitors");
  if (value) {
    await database.from("settings").insert({ key: "visitors", value, is_public: true });
  }
}

/** Opens the chat page and waits for its first check-in. Returns the browser's visitor id. */
async function openChat(page: Page): Promise<string> {
  await page.goto("/chat");
  const handle = await page.waitForFunction(() => window.localStorage.getItem("helpwren.visitor"));
  const id = String(await handle.jsonValue());
  visitorIds.push(id);
  await expect
    .poll(async () => (await database.from("visitors").select("id").eq("id", id)).data?.length)
    .toBe(1);
  return id;
}

/** How the dashboard names a visitor who has not written: "Visitor" and the start of the id. */
function visitorName(id: string) {
  return `Visitor ${id
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase()}`;
}

test.beforeAll(async () => {
  const { data } = await database
    .from("settings")
    .select("value")
    .eq("key", "visitors")
    .maybeSingle();
  saved = (data?.value as VisitorSetting | undefined) ?? null;
});

test.afterEach(async () => {
  await setVisitors(saved);
  // Whoever the visitors became when they took up a message, and the browsers themselves.
  const { data } = await database.from("visitors").select("contact_id").in("id", visitorIds);
  for (const { contact_id: contactId } of data ?? []) {
    if (!contactId) continue;
    await database.from("conversations").delete().eq("contact_id", contactId);
    await database.auth.admin.deleteUser(contactId);
  }
  await database.from("visitors").delete().in("id", visitorIds);
  visitorIds.length = 0;
});

test("a visitor shows in Visitors with their page, until the setting hides the list", async ({
  browser,
}) => {
  await setVisitors({ tracking: true, liveList: true });
  const visitor = await (await browser.newContext()).newPage();
  const id = await openChat(visitor);

  const agent = await (await browser.newContext()).newPage();
  await signInToInbox(agent, "sam@example.com");
  await agent.getByRole("link", { name: "Visitors" }).click();
  await expect(agent).toHaveURL(/\/dashboard\/visitors$/);

  const table = agent.getByRole("table", { name: "Visitors on your site now" });
  const row = table.getByRole("row").filter({ hasText: visitorName(id) });
  await expect(row).toBeVisible();
  // The page they are on, as a link to it.
  await expect(row.getByRole("link")).toHaveAttribute("href", /\/chat$/);

  await row.getByRole("button", { name: visitorName(id) }).click();
  const details = agent.getByRole("region", { name: "Visitor" });
  await expect(details.getByText("On the site")).toBeVisible();
  await expect(details.getByText("Sessions")).toBeVisible();

  // Switching the live list off takes the section out of the sidebar, and the page says why.
  await setVisitors({ tracking: true, liveList: false });
  await agent.reload();
  await expect(agent.getByText("The live list is switched off")).toBeVisible();
  await expect(agent.getByRole("link", { name: "Visitors", exact: true })).toHaveCount(0);
  await expect(table).toHaveCount(0);

  // With tracking off as well, the install takes no check-ins at all.
  await setVisitors({ tracking: false, liveList: false });
  await agent.reload();
  await expect(agent.getByText("Visitor tracking is switched off")).toBeVisible();
  const refused = await agent.request.post("/api/visitors", {
    data: { visitorId: id, page: { url: "https://shop.example.com/" } },
  });
  expect(refused.status()).toBe(410);
});

test("a team member writes first, and the message reaches the visitor's chat", async ({
  browser,
}) => {
  await setVisitors({ tracking: true, liveList: true });
  const visitor = await (await browser.newContext()).newPage();
  const id = await openChat(visitor);

  const agent = await (await browser.newContext()).newPage();
  await signInToInbox(agent, "sam@example.com");
  await agent.goto(`/dashboard/visitors?visitor=${id}`);
  const details = agent.getByRole("region", { name: "Visitor" });
  await details.getByLabel("Message").fill("Hi! Can I help you find a plan?");
  await details.getByRole("button", { name: "Start conversation" }).click();
  await expect(details.getByText("Waiting for the visitor's browser to pick it up")).toBeVisible();

  // The visitor's browser checks in again when they come back to the page.
  await visitor.reload();
  const tabs = visitor.getByRole("navigation", { name: "Chat" });
  await expect(tabs.getByRole("button", { name: "Messages, 1 unread" })).toBeVisible();
  const recent = visitor.getByRole("region", { name: "Recent message" });
  await expect(recent).toContainText("Hi! Can I help you find a plan?");

  // The team sees it was picked up, and can go to the conversation.
  await expect(details.getByText("Their browser picked up your message.")).toBeVisible({
    timeout: 20_000,
  });
  await details.getByRole("link", { name: "Open the conversation" }).click();
  await expect(agent.getByRole("log", { name: "Messages" })).toContainText(
    "Hi! Can I help you find a plan?",
  );

  // Reading it in the chat clears the count.
  await recent.getByRole("button").click();
  await expect(visitor.getByRole("log", { name: "Messages" })).toContainText(
    "Hi! Can I help you find a plan?",
  );
});

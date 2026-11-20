import { expect, test, type Browser, type FrameLocator, type Page } from "@playwright/test";

import { database, RUN } from "../support/database";
import { signInToInbox } from "../support/mailbox";
import {
  AGENT,
  chatOf,
  ELSEWHERE,
  newGlownUser,
  removePeople,
  signUp,
  SITE,
  setUpGlownInstall,
  WEB_APP,
  writeAsUser,
  type GlownUser,
} from "./support/glown";

// Contextual help through Glown (examples/nextjs): a page's own filter, a rule set in the
// dashboard with no code on the page, the fallback search, the inline block, the public
// endpoint, and what the inbox shows of it. The example's pages name the tags glown-billing and
// glown-refunds; the articles carrying them are made here and removed afterwards.
setUpGlownInstall();

const ADMIN = "ada@example.com";
const SETTINGS = "/dashboard/settings/contextual-help";
const CALENDAR_TAG = `glown-calendar-${RUN}`;
const RULE = `Glown bookings ${RUN}`;
const ARTICLES = {
  billing: { title: `Read a Glown invoice ${RUN}`, tags: ["glown-billing"] },
  refunds: { title: `Refund a deposit ${RUN}`, tags: ["glown-refunds"] },
  calendar: { title: `Move a booking ${RUN}`, tags: [CALENDAR_TAG] },
  // Found only by the fallback, which searches for the Staff page's title.
  staff: { title: `Add staff to your salon ${RUN}`, tags: [] },
} as const;

let collectionId = "";
const made: string[] = [];

test.beforeAll(async () => {
  // Articles a run that stopped half way left behind under the example's own tags.
  await database.from("articles").delete().overlaps("tags", ["glown-billing", "glown-refunds"]);
  const { data: collection, error } = await database
    .from("collections")
    .insert({ name: `Glown help (${RUN})`, slug: `glown-help-${RUN}` })
    .select("id")
    .single();
  if (error) throw error;
  collectionId = collection.id;
  const inserted = await database.from("articles").insert(
    Object.entries(ARTICLES).map(([key, article]) => ({
      collection_id: collectionId,
      title: article.title,
      slug: `${key}-${RUN}`,
      summary: `For the ${key} page.`,
      status: "published",
      tags: [...article.tags],
    })),
  );
  if (inserted.error) throw inserted.error;
});

test.afterAll(async () => {
  await database.from("articles").delete().eq("collection_id", collectionId);
  await database.from("collections").delete().eq("id", collectionId);
});

test.afterEach(async () => {
  await removePeople(made.splice(0));
});

/** Runs `step` on Settings > Contextual help as an admin, in a window of its own. */
async function asAdmin(browser: Browser, step: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await signInToInbox(page, ADMIN);
  await page.goto(SETTINGS);
  await step(page);
  await context.close();
}

/** Adds the rule an admin would: Glown's /bookings/* pages show the calendar articles. */
async function addBookingsRule(page: Page) {
  await page.getByRole("button", { name: "New rule" }).click();
  const dialog = page.getByRole("dialog", { name: "New rule" });
  await dialog.getByLabel("Name").fill(RULE);
  await dialog.getByRole("textbox", { name: "URL matches" }).fill("/bookings/*");
  await dialog.getByRole("combobox", { name: "Tags, any of" }).fill(CALENDAR_TAG);
  await dialog.getByRole("combobox", { name: "Tags, any of" }).press("Enter");
  await dialog.getByRole("button", { name: "Add rule" }).click();
  await expect(dialog).toBeHidden();
}

/** Removes the rule as an admin does, which also tells the install to stop using it. */
async function removeBookingsRule(page: Page) {
  await page
    .getByRole("table", { name: "Rules" })
    .getByRole("button", { name: `Delete, ${RULE}` })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete rule" }).click();
  await expect(page.getByRole("table", { name: "Rules" }).getByText(RULE)).toHaveCount(0);
}

/** Switches the fallback search on or off, unless it already is. */
async function setFallback(page: Page, on: boolean) {
  const control = page.getByRole("switch", { name: "Search for the page's title" });
  if ((await control.isChecked()) !== on) {
    await control.click();
    await expect(page.getByText(on ? "Fallback search on" : "Fallback search off")).toBeVisible();
  }
}

/** Opens the web app's chat from the header's Help button. */
async function openChat(page: Page): Promise<FrameLocator> {
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  const chat = chatOf(page);
  await expect(chat.getByRole("button", { name: "Send us a message" })).toBeVisible();
  return chat;
}

const pageHelp = (chat: FrameLocator) => chat.getByRole("region", { name: "Help for this page" });

async function newUser(page: Page): Promise<GlownUser> {
  const user = newGlownUser("Tolu");
  made.push(user.email);
  await signUp(page, user);
  return user;
}

test("a page's filter shows its articles under Help for this page, and opens one in the chat", async ({
  page,
}) => {
  await newUser(page);
  await page.goto(`${WEB_APP}/billing`);
  // The same filter, drawn by the page itself from the public endpoint.
  await expect(
    page.getByRole("navigation", { name: "Billing help" }).getByRole("button", {
      name: ARTICLES.billing.title,
    }),
  ).toBeVisible();

  const chat = await openChat(page);
  const help = pageHelp(chat);
  await expect(
    help.getByRole("button", { name: new RegExp(ARTICLES.billing.title) }),
  ).toBeVisible();
  await expect(help).not.toContainText(ARTICLES.refunds.title);

  await help.getByRole("button", { name: new RegExp(ARTICLES.billing.title) }).click();
  await expect(chat.getByRole("heading", { name: ARTICLES.billing.title })).toBeVisible();
});

test("a rule matches a page with no code, a page's filter beats it, and the inbox shows each", async ({
  browser,
  page,
}) => {
  await asAdmin(browser, addBookingsRule);
  try {
    await newUser(page);
    await page.goto(`${WEB_APP}/bookings/calendar`);
    const chat = await openChat(page);
    await expect(pageHelp(chat)).toContainText(ARTICLES.calendar.title);

    // Under /bookings/ too, but with a filter of its own.
    await page.goto(`${WEB_APP}/bookings/refunds`);
    const refunds = await openChat(page);
    await expect(pageHelp(refunds)).toContainText(ARTICLES.refunds.title);
    await expect(pageHelp(refunds)).not.toContainText(ARTICLES.calendar.title);

    // A conversation keeps what applied: here the page's filter.
    await writeAsUser(refunds, `Where is my deposit? ${RUN}`);
    const inbox = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await signInToInbox(inbox, AGENT);
    const conversations = inbox.getByRole("list", { name: "Conversations" });
    await conversations
      .getByRole("button", { name: new RegExp(`Where is my deposit\\? ${RUN}`) })
      .click();
    const details = inbox.getByRole("region", { name: "Details" });
    await expect(details).toContainText("Help for this page");
    await expect(details).toContainText("Set by the page");
    await expect(details).toContainText("Tags any of glown-refunds");

    // And on the calendar, the rule that matched.
    await page.goto(`${WEB_APP}/bookings/calendar`);
    const calendar = await openChat(page);
    await expect(pageHelp(calendar)).toContainText(ARTICLES.calendar.title);
    await writeAsUser(calendar, `Can I move a booking? ${RUN}`);
    await conversations
      .getByRole("button", { name: new RegExp(`Can I move a booking\\? ${RUN}`) })
      .click();
    await expect(details.getByText(RULE)).toBeVisible();
    await inbox.context().close();
  } finally {
    await asAdmin(browser, removeBookingsRule);
  }
});

test("a page nothing applies to falls back to its title, until the fallback is switched off", async ({
  browser,
  page,
}) => {
  await newUser(page);
  await page.goto(`${WEB_APP}/staff`);
  const chat = await openChat(page);
  await expect(pageHelp(chat)).toContainText(ARTICLES.staff.title);

  await asAdmin(browser, (admin) => setFallback(admin, false));
  try {
    const answered = page.waitForResponse((response) =>
      response.url().endsWith("/api/articles/contextual"),
    );
    await page.reload();
    const again = await openChat(page);
    // Once the install has answered for this page, there is nothing of its own to list.
    expect(await (await answered).json()).toMatchObject({ match: null, articles: [] });
    await expect(pageHelp(again)).toHaveCount(0);
  } finally {
    await asAdmin(browser, (admin) => setFallback(admin, true));
  }
});

test("an inline block on the page fills with articles, and opens one in the chat", async ({
  page,
}) => {
  await page.goto(`${SITE}/refunds`);
  const block = page.locator("[data-helpwren-help]");
  const link = block.getByRole("link", { name: new RegExp(ARTICLES.refunds.title) });
  await expect(link).toBeVisible();
  await expect(block).toHaveAttribute("data-helpwren-state", "ready");
  await expect(block).not.toContainText(ARTICLES.billing.title);

  await link.click();
  // Not a new page: the widget opened the article in its panel.
  expect(new URL(page.url()).pathname).toBe("/refunds");
  const chat = chatOf(page);
  await expect(chat.getByRole("heading", { name: ARTICLES.refunds.title })).toBeVisible();
});

test("the public endpoint answers Glown's pages and refuses other sites", async ({
  page,
  baseURL,
}) => {
  const endpoint = `${baseURL ?? ""}/api/articles?tags=glown-refunds&limit=3`;
  const read = (target: Page) =>
    target.evaluate(async (url) => {
      try {
        const response = await fetch(url);
        return { status: response.status, body: (await response.json()) as unknown };
      } catch {
        return { status: "blocked" as const, body: null };
      }
    }, endpoint);

  await page.goto(`${SITE}/refunds`);
  const fromGlown = await read(page);
  expect(fromGlown.status).toBe(200);
  expect(fromGlown.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: ARTICLES.refunds.title, slug: `refunds-${RUN}` }),
    ]),
  );

  // The same page on an address that is not one of the install's domains.
  await page.goto(`${ELSEWHERE}/refunds`);
  expect((await read(page)).status).toBe("blocked");
  const direct = await page.request.get(endpoint, { headers: { origin: ELSEWHERE } });
  expect(direct.status()).toBe(403);
  expect(direct.headers()["access-control-allow-origin"]).toBeUndefined();
});

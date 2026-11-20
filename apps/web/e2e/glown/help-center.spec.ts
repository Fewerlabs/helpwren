import { expect, test, type Page } from "@playwright/test";

import { database } from "../support/database";
import {
  chatOf,
  ELSEWHERE,
  newGlownUser,
  removePeople,
  signUp,
  SITE,
  setUpGlownInstall,
  WEB_APP,
} from "./support/glown";

// The help center at glown.io/help: the public site rewrites /help/:path* to the install, as
// section 4.6 of the build plan sets out, and the install's help center address points there.
// Runs against the demo's articles.
setUpGlownInstall({ helpCenter: true });

const ARTICLE = "/help/getting-started/add-the-chat-to-your-website";

/** Every request the page made that failed, so a missing script or style is caught. */
function failedRequests(page: Page): string[] {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  return failed;
}

test("the help center works at the public site's /help, through the rewrite", async ({ page }) => {
  const failed = failedRequests(page);
  await page.goto(`${SITE}/help`);
  await expect(page).toHaveTitle("Glown Help Center");
  await expect(page.getByRole("heading", { level: 1, name: "How can we help?" })).toBeVisible();
  // Its own scripts and styles came through the rewrite too: the page is styled, and its
  // search window opens, which needs the script running.
  await expect(page.getByText("⌘K").first()).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).display)).toBe("block");
  expect(await page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);

  // Links stay on glown.io/help, from the home page to a collection to an article.
  await page
    .getByRole("link", { name: /^Getting started/ })
    .first()
    .click();
  await expect(page).toHaveURL(`${SITE}/help/getting-started`);
  await page
    .getByRole("list", { name: "Articles in Getting started" })
    .getByRole("link", { name: /Add the chat to your website/ })
    .click();
  await expect(page).toHaveURL(`${SITE}${ARTICLE}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Add the chat to your website" }),
  ).toBeVisible();

  // Search engines are told the glown.io address is the one true one.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${ARTICLE}`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${SITE}${ARTICLE}`,
  );
  expect(failed.filter((entry) => entry.includes("/help"))).toEqual([]);
});

test("a reader searches, and says whether an article helped, through the rewrite", async ({
  page,
}) => {
  await page.goto(`${SITE}/help/search?q=invoice`);
  const results = page.getByRole("list", { name: "Search results" });
  await results.getByRole("link", { name: /Read your invoice/ }).click();
  await expect(page).toHaveURL(`${SITE}/help/account-and-billing/read-your-invoice`);

  // As they type, from the search window.
  await page.goto(`${SITE}${ARTICLE}`);
  await expect(page.getByText("⌘K").first()).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const window = page.getByRole("dialog", { name: "Search the help center" });
  await window.getByRole("searchbox").fill("invite");
  await window.getByRole("link", { name: /Invite your team/ }).click();
  await expect(page).toHaveURL(new RegExp(`^${SITE}/help/getting-started/invite`));

  // Feedback is sent to the install, not to glown.io, which does not have the API.
  const { data: article } = await database
    .from("articles")
    .select("id")
    .eq("slug", "read-your-invoice")
    .single();
  const before = await database
    .from("article_feedback")
    .select("id")
    .eq("article_id", article?.id ?? "");
  await page.goto(`${SITE}/help/account-and-billing/read-your-invoice`);
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Thanks for letting us know.")).toBeVisible();
  const after = await database
    .from("article_feedback")
    .select("id, helpful")
    .eq("article_id", article?.id ?? "");
  const known = new Set((before.data ?? []).map((row) => row.id));
  const added = (after.data ?? []).filter((row) => !known.has(row.id));
  expect(added.map((row) => row.helpful)).toEqual([true]);
  await database
    .from("article_feedback")
    .delete()
    .in(
      "id",
      added.map((row) => row.id),
    );
});

test("the sitemap lists the glown.io addresses", async ({ request }) => {
  const response = await request.get(`${SITE}/help/sitemap.xml`);
  expect(response.ok()).toBe(true);
  const sitemap = await response.text();
  expect(sitemap).toContain(`<loc>${SITE}/help</loc>`);
  expect(sitemap).toContain(`<loc>${SITE}/help/getting-started</loc>`);
  expect(sitemap).toContain(`<loc>${SITE}${ARTICLE}</loc>`);
  // Only those: no page is listed at the install's own address.
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locations.every((location) => location?.startsWith(`${SITE}/help`))).toBe(true);
});

test("a reader asks the team from the help center, in the install's chat", async ({ page }) => {
  await page.goto(`${SITE}${ARTICLE}`);
  // By keyboard: the install's dev server puts its own badge in the same corner.
  await page.getByRole("button", { name: "Open chat" }).press("Enter");
  await expect(chatOf(page).getByRole("button", { name: "Send us a message" })).toBeVisible();
  // "Chat with us" leads to the chat on the install, not to a page glown.io does not have.
  const link = page.getByRole("link", { name: "Chat with us" });
  const href = await link.getAttribute("href");
  expect(href).toMatch(/\/chat$/);
  expect(new URL(href ?? "", SITE).origin).not.toBe(SITE);
});

test("the web app shows the help center inside its own page", async ({ page }) => {
  const user = newGlownUser("Chidi");
  await signUp(page, user);
  await page.getByRole("link", { name: "Support articles" }).click();
  const frame = page.frameLocator('iframe[title="Help articles"]');
  await frame
    .getByRole("link", { name: /^Getting started/ })
    .first()
    .click();
  await frame
    .getByRole("link", { name: /Add the chat to your website/ })
    .first()
    .click();
  await expect(
    frame.getByRole("heading", { level: 1, name: "Add the chat to your website" }),
  ).toBeVisible();
  // Without the help center's own header, and as tall as what it shows.
  await expect(frame.getByRole("link", { name: "Powered by Helpwren" })).toHaveCount(0);
  await expect
    .poll(async () => (await page.locator('iframe[title="Help articles"]').boundingBox())?.height)
    .toBeGreaterThan(500);
  await removePeople([user.email]);
});

test("only Glown's two hostnames may show the chat", async ({ page }) => {
  await page.goto(SITE);
  await page.getByRole("button", { name: "Open chat" }).click();
  await expect(chatOf(page).getByRole("button", { name: "Send us a message" })).toBeVisible();

  await page.goto(`${WEB_APP}/login`);
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  await expect(chatOf(page).getByRole("button", { name: "Send us a message" })).toBeVisible();

  // The same page from an address that is not listed: the browser refuses to frame the chat.
  await page.goto(ELSEWHERE);
  await page.getByRole("button", { name: "Open chat" }).click();
  await expect(page.locator("iframe[title='Chat']")).toBeAttached();
  await expect(chatOf(page).getByRole("button", { name: "Send us a message" })).toHaveCount(0);
});

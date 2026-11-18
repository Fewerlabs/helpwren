import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data: three collections holding six
// published articles and one draft. Visitors do not sign in; only the last test, where an
// admin changes the branding, does.
const ARTICLE = "/help/getting-started/add-the-chat-to-your-website";

test.afterAll(async () => {
  await database.from("settings").delete().eq("key", "help_center");
});

test("a visitor browses from the home page to an article", async ({ page }) => {
  await page.goto("/help");
  await expect(page).toHaveTitle("Helpwren Demo Help Center");
  await expect(page.getByRole("heading", { level: 1, name: "How can we help?" })).toBeVisible();

  // Collections are cards with how many articles each holds; the draft is not counted.
  await expect(page.getByRole("link", { name: /Getting started.*3 articles/s })).toBeVisible();
  await expect(page.getByRole("link", { name: /Troubleshooting.*1 article/s })).toBeVisible();
  await expect(page.getByRole("list", { name: "Popular articles" })).toContainText(
    "The chat does not appear",
  );

  await page.getByRole("link", { name: /Getting started/ }).click();
  await expect(page).toHaveURL(/\/help\/getting-started$/);
  await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
  const articles = page.getByRole("list", { name: "Articles in Getting started" });
  await expect(articles.getByRole("link")).toHaveCount(3);

  await articles.getByRole("link", { name: /Add the chat to your website/ }).click();
  await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Add the chat to your website" }),
  ).toBeVisible();

  // The way back up, a table of contents made from the headings, and what to read next.
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link", { name: "Getting started" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Check it works" })
    .click();
  await expect(page).toHaveURL(/#check-it-works$/);
  await expect(page.getByRole("list", { name: "Related articles" })).toContainText(
    "Invite your team",
  );
  await expect(page.getByRole("link", { name: "Chat with us" })).toBeVisible();
});

test("a visitor says whether an article helped, once", async ({ page }) => {
  await page.goto(ARTICLE);
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Thanks for letting us know.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Thanks for letting us know.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes" })).toHaveCount(0);

  await database
    .from("article_feedback")
    .delete()
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
});

test("a visitor searches the help center", async ({ page }) => {
  await page.goto("/help");
  const search = page.getByRole("searchbox", { name: "Search for articles" });
  await search.fill("tag manager");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/help\/search\?q=tag\+manager$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText('Results for "tag manager"');
  const results = page.getByRole("list", { name: "Search results" });
  await expect(results.getByRole("link")).toHaveCount(1);
  await expect(results).toContainText("Add the chat to your website");

  // A draft is never found, and a search with no match says so.
  await page.goto("/help/search?q=arrive+late");
  await expect(page.getByText("No articles found.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nothing matched those words" })).toBeVisible();
});

test("drafts and pages that do not exist are not found", async ({ page }) => {
  for (const path of [
    "/help/troubleshooting/messages-arrive-late",
    "/help/no-such-collection",
    "/help/getting-started/no-such-article",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page does not exist" })).toBeVisible();
  }

  // A team member's preview is theirs alone.
  await page.goto("/help/preview/f1000000-0000-4000-8000-000000000007");
  await expect(page).toHaveURL(/\/login/);
});

test("an article moved to another collection is found at its new address", async ({ page }) => {
  await page.goto("/help/troubleshooting/add-the-chat-to-your-website");
  await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
});

test("each page tells search engines what it is", async ({ page, request }) => {
  await page.goto(ARTICLE);
  await expect(page).toHaveTitle("Add the chat to your website | Helpwren Demo Help Center");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`${ARTICLE}$`),
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Paste one snippet and the chat appears on every page.",
  );

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.map((block) => (JSON.parse(block) as { "@type": string })["@type"]);
  expect(types).toEqual(["Article", "BreadcrumbList"]);

  const sitemap = await (await request.get("/help/sitemap.xml")).text();
  expect(sitemap).toContain(`${ARTICLE}</loc>`);
  expect(sitemap).toContain("/help/account-and-billing</loc>");
  expect(sitemap).not.toContain("messages-arrive-late");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /dashboard");
  expect(robots).toContain("/help/sitemap.xml");

  await page.goto("/help/search?q=chat");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("an admin brands the help center, and visitors see it at once", async ({ page }) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/branding");
  await page.getByRole("tab", { name: "Help center" }).click();

  await page.getByLabel("Title").fill("Acme answers");
  await page.getByLabel("Search hint").fill("Search Acme help");
  await page.getByRole("radio", { name: "Plain" }).check();
  await page.getByRole("button", { name: "Add link" }).first().click();
  await page.getByLabel("Header link 1 name").fill("Back to Acme");
  await page.getByLabel("Header link 1 address").fill("https://acme.example");
  await page.getByRole("switch", { name: "Show the chat launcher on help pages" }).click();

  // The preview beside the form is the real header, wearing what is typed before it is saved.
  const preview = page.getByRole("region", { name: "Help center preview" });
  await expect(preview).toContainText("Acme answers");
  await expect(preview).toContainText("Back to Acme");

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  // On a phone, as a visitor.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/help");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acme answers");
  await expect(page.getByRole("searchbox", { name: "Search Acme help" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Powered by Helpwren" })).toBeVisible();

  // Nothing is wider than the phone's screen, and the contents fold away above the article.
  await page.goto(ARTICLE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await expect(page.getByText("On this page")).toBeVisible();
});

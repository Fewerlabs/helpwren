import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data: three collections holding six
// published articles and one draft. Visitors do not sign in; only the last test, where an
// admin changes the branding, does. Someone trying the app may have written articles of their
// own, so a collection's count is checked against what the database holds for it.
const ARTICLE = "/help/getting-started/add-the-chat-to-your-website";

/**
 * A collection's card, which says how many published articles it holds: on the help center the
 * public ones, in the chat those shown there too.
 */
async function collectionCard(name: string, slug: string, place: "help center" | "chat") {
  const { data: collection } = await database
    .from("collections")
    .select("id")
    .eq("slug", slug)
    .single();
  const { count } = await database
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collection?.id ?? "")
    .eq("status", "published")
    .in("visibility", place === "chat" ? ["public", "in_app"] : ["public"]);
  const articles = count === 1 ? "1 article" : `${count ?? 0} articles`;
  return { name: new RegExp(`${name}.*${articles}`, "s"), count: count ?? 0 };
}

test.afterAll(async () => {
  await database.from("settings").delete().eq("key", "help_center");
});

test("a visitor browses from the home page to an article", async ({ page }) => {
  await page.goto("/help");
  await expect(page).toHaveTitle("Helpwren Demo Help Center");
  await expect(page.getByRole("heading", { level: 1, name: "How can we help?" })).toBeVisible();

  // Collections are cards with how many articles each holds; the draft is not counted.
  const gettingStarted = await collectionCard("Getting started", "getting-started", "help center");
  const troubleshooting = await collectionCard("Troubleshooting", "troubleshooting", "help center");
  expect(gettingStarted.count).toBeGreaterThanOrEqual(4);
  await expect(page.getByRole("link", { name: gettingStarted.name })).toBeVisible();
  await expect(page.getByRole("link", { name: troubleshooting.name })).toBeVisible();
  await expect(page.getByRole("list", { name: "Popular articles" })).toContainText(
    "The chat does not appear",
  );

  await page.getByRole("link", { name: gettingStarted.name }).click();
  await expect(page).toHaveURL(/\/help\/getting-started$/);
  await expect(page.getByRole("heading", { level: 1, name: "Getting started" })).toBeVisible();
  const articles = page.getByRole("list", { name: "Articles in Getting started" });
  await expect(articles.getByRole("link")).toHaveCount(gettingStarted.count);

  await articles.getByRole("link", { name: /Add the chat to your website/ }).click();
  await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Add the chat to your website" }),
  ).toBeVisible();

  // The list of every article beside the page marks where the reader is.
  const list = page.getByRole("complementary").getByRole("navigation", { name: "All articles" });
  await expect(list.getByRole("link", { name: "Read your invoice" })).toBeVisible();
  await expect(list.getByRole("link", { name: "Add the chat to your website" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // A table of contents made from the headings, what comes next, and a way to a person.
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Check it works" })
    .click();
  await expect(page).toHaveURL(/#check-it-works$/);
  await expect(page.getByRole("navigation", { name: "More in this collection" })).toContainText(
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

test("a visitor finds an article as they type, from the search window", async ({ page }) => {
  await page.goto(ARTICLE);
  // The hint appears once the page's script is running, which is when ⌘K starts to work.
  await expect(page.getByText("⌘K").first()).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const window = page.getByRole("dialog", { name: "Search the help center" });
  await window.getByRole("searchbox").fill("invoice");
  await expect(window.getByRole("link", { name: /Read your invoice/ })).toBeVisible();

  // The arrow keys move from the words to the results, and Enter opens one.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/help\/account-and-billing\/read-your-invoice$/);
  await expect(window).toHaveCount(0);

  // The byline names who wrote it, and a code block can be copied.
  await expect(page.getByText("Written by")).toBeVisible();
  await page.goto(ARTICLE);
  await expect(page.getByRole("button", { name: "Copy" }).first()).toBeVisible();
});

test("a visitor searches the help center", async ({ page }) => {
  await page.goto("/help");
  // From the large box on the home page: the window opens, and Enter goes to every result.
  await expect(page.getByText("⌘K").first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Search for articles" }).click();
  const window = page.getByRole("dialog", { name: "Search the help center" });
  await window.getByRole("searchbox").fill("tag manager");
  await window.getByRole("searchbox").press("Enter");

  await expect(page).toHaveURL(/\/help\/search\?q=tag(\+|%20)manager$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText('Results for "tag manager"');
  // Every published article the words find is listed, the demo's among them.
  const results = page.getByRole("list", { name: "Search results" });
  const { data: found } = await database
    .rpc("search_articles", { query: "tag manager" })
    .eq("status", "published");
  await expect(results.getByRole("link")).toHaveCount(found?.length ?? 0);
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

  await page.getByLabel("Title", { exact: true }).fill("Acme answers");
  await page.getByLabel("Search hint").fill("Search Acme help");
  // The radio itself is hidden under its card, which is what a person presses.
  await page.getByRole("radiogroup", { name: "Background" }).getByText("Plain").click();
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
  // Saving clears what the help center keeps, so the new brand shows within a visit or two.
  await expect(async () => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acme answers", {
      timeout: 1_000,
    });
  }).toPass({ timeout: 75_000, intervals: [500, 1_000, 2_000, 5_000] });
  await expect(page.getByRole("searchbox", { name: "Search Acme help" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Powered by Helpwren" })).toBeVisible();

  // Nothing is wider than the phone's screen, and the contents fold away above the article.
  await page.goto(ARTICLE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await expect(page.getByRole("article").getByText("On this page")).toBeVisible();
  // The list of articles slides in over the page; it does not push the article down.
  await page.getByRole("button", { name: "Browse all articles" }).click();
  await expect(
    page.getByRole("navigation", { name: "All articles" }).getByRole("link", {
      name: "Invite your team",
    }),
  ).toBeVisible();
});

test("a visitor finds and reads an article inside the chat", async ({ page }) => {
  await page.goto("/chat");

  // The home screen suggests the articles the team put forward, the latest first.
  const { data: latest } = await database
    .from("articles")
    .select("title")
    .eq("status", "published")
    .eq("featured", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  const suggested = page.getByRole("region", { name: "Suggested articles" });
  await expect(suggested.getByRole("button", { name: latest?.title ?? "" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Chat" })
    .getByRole("button", { name: "Help" })
    .click();

  // The Help tab lists the collections; opening one shows its articles.
  const billing = await collectionCard("Account and billing", "account-and-billing", "chat");
  await page.getByRole("button", { name: billing.name }).click();
  await expect(page.getByRole("heading", { name: "Account and billing" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Change who can sign in/ })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();

  // Search looks across every collection.
  await page.getByRole("searchbox", { name: "Search for help" }).fill("invoice");
  await page.getByRole("button", { name: /Read your invoice/ }).click();

  await expect(page.getByRole("heading", { name: "Read your invoice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Download an invoice" })).toBeVisible();
  // Still in the chat, with the way to a person one tap away.
  await expect(page).toHaveURL(/\/chat$/);
  await page.getByRole("button", { name: /Still need help/ }).click();
  await expect(page.getByRole("heading", { name: "New conversation" })).toBeVisible();
});

test("a host embeds the help center without its chrome, and is told its height", async ({
  page,
  baseURL,
}) => {
  // A page standing in for the host's, with the help center in a frame, as the snippet on the
  // Installation page sets it up.
  const origin = baseURL ?? "";
  // A plain page of this install stands in for the host's, so nothing of the app's own is on
  // it. (A browser will not let a page from nowhere frame a local address.)
  await page.goto("/robots.txt");
  await page.setContent(`
    <iframe id="help" title="Help" style="width: 100%; min-height: 320px; border: 0"
      src="${origin}/help?embed=1&hide=chat&accent=1d4ed8"></iframe>
    <script>
      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.channel !== "helpwren" || message.type !== "help-height") return;
        document.getElementById("help").style.height = message.height + "px";
        window.reported = message.height;
      });
    </script>`);
  const frame = page.frameLocator("#help");

  // The content alone: no brand header, no footer, no credit, no launcher.
  const gettingStarted = await collectionCard("Getting started", "getting-started", "help center");
  await expect(frame.getByRole("link", { name: gettingStarted.name })).toBeVisible();
  // Whatever the branding test before this one called it, the search is there.
  await expect(frame.getByRole("searchbox")).toBeVisible();
  await expect(frame.getByRole("link", { name: "Powered by Helpwren" })).toHaveCount(0);
  // The greeting stays, with the search under it, until the host hides them.
  await expect(frame.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(frame.getByRole("searchbox")).toHaveCount(1);

  // The frame is as tall as what it shows.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { reported?: number }).reported ?? 0))
    .toBeGreaterThan(300);

  // Links stay in the frame and in the embedded form, with the host's options.
  await frame.getByRole("link", { name: gettingStarted.name }).click();
  await frame.getByRole("link", { name: /Add the chat to your website/ }).click();
  await expect(
    frame.getByRole("heading", { level: 1, name: "Add the chat to your website" }),
  ).toBeVisible();
  await expect(frame.getByText("Was this helpful?")).toBeVisible();
  await expect(frame.getByRole("link", { name: "Chat with us" })).toHaveCount(0);
  await expect(frame.getByRole("link", { name: "Powered by Helpwren" })).toHaveCount(0);
  expect(page.frames().at(-1)?.url()).toContain("embed=1&hide=chat&accent=1d4ed8");

  // A host can open it on a collection or a search, and unknown options are dropped.
  await page.goto("/help?embed=1&collection=troubleshooting&hide=nonsense&accent=red");
  await expect(page).toHaveURL(/\/help\/troubleshooting\?embed=1$/);
  await page.goto("/help?embed=1&q=invoice");
  await expect(page).toHaveURL(/\/help\/search\?q=invoice&embed=1$/);
  await expect(page.getByRole("list", { name: "Search results" })).toContainText(
    "Read your invoice",
  );
});

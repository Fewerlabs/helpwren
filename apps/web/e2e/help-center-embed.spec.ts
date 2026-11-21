import { expect, test, type Page } from "@playwright/test";

import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data: three collections of articles,
// "Getting started" among them. A plain page of this install stands in for the host's, so
// nothing of the app's own is on it. (A browser will not let a page from nowhere frame a local
// address.)

/** The "Getting started" collection's card, which ends with how many articles it holds. */
const CARD = /^Getting started.*\d+ articles?$/s;

/** A host page with the help center in a frame, sized from its height messages as the snippet does. */
async function host(page: Page, origin: string, query: string, style = "width: 100%") {
  await page.goto("/robots.txt");
  await page.setContent(`
    <iframe id="help" title="Help" style="${style}; min-height: 320px; border: 0"
      src="${origin}/help?${query}"></iframe>
    <script>
      window.reported = [];
      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.channel !== "helpwren" || message.type !== "help-height") return;
        const frame = document.getElementById("help");
        frame.style.minHeight = "0";
        frame.style.height = message.height + "px";
        window.reported.push(message.height);
      });
    </script>`);
  return page.frameLocator("#help");
}

/** The heights the frame has reported so far, latest last. */
const reported = (page: Page) =>
  page.evaluate(() => (window as unknown as { reported: number[] }).reported);
const lastReported = async (page: Page) => (await reported(page)).at(-1) ?? 0;

/** The frame's document, for measuring from inside it. */
const frameDocument = (page: Page) => {
  const frame = page.frames().at(-1);
  if (!frame) throw new Error("The help center frame is not on the page.");
  return frame;
};

test("a host hides parts of the embedded home, and the rest still shows", async ({
  page,
  baseURL,
}) => {
  const frame = await host(page, baseURL ?? "", "embed=1&hide=footer,breadcrumbs");

  await expect(frame.getByRole("searchbox")).toBeVisible();
  await expect(frame.getByRole("link", { name: CARD })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(frame.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  await expect(frame.getByRole("contentinfo")).toHaveCount(0);
  await expect(frame.getByRole("link", { name: "Powered by Helpwren" })).toHaveCount(0);

  // A collection opened inside the frame keeps its breadcrumbs hidden too.
  await frame.getByRole("link", { name: CARD }).click();
  await expect(frame.getByRole("heading", { level: 1, name: /Getting started/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(frame.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  // An unknown part is dropped from the address the frame moves on with.
  await expect
    .poll(() => frameDocument(page).url())
    .toMatch(/\/help\/getting-started\?embed=1&hide=breadcrumbs$/);
});

test("a host keeps only the search and the collections, and the options follow the reader", async ({
  page,
  baseURL,
}) => {
  const frame = await host(page, baseURL ?? "", "embed=1&hide=title,subtitle&padding=compact");

  await expect(frame.getByRole("searchbox")).toBeVisible();
  await expect(frame.getByRole("link", { name: CARD })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(frame.getByText("How can we help?")).toHaveCount(0);
  await expect.poll(() => lastReported(page)).toBeGreaterThan(100);
  const homeHeight = await lastReported(page);

  // Into a collection: the address keeps the options, its own heading is hidden as asked, and
  // the way back is there.
  await frame.getByRole("link", { name: CARD }).click();
  await expect(frame.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect
    .poll(() => frameDocument(page).url())
    .toContain("/help/getting-started?embed=1&hide=title,subtitle&padding=compact");

  // On to an article and back home through the breadcrumb, still in the same view.
  await frame.getByRole("link", { name: /Add the chat to your website/ }).click();
  await expect(
    frame.getByRole("heading", { level: 1, name: "Add the chat to your website" }),
  ).toBeVisible();
  await expect
    .poll(() => frameDocument(page).url())
    .toContain("embed=1&hide=title,subtitle&padding=compact");
  // The article is taller than the home page, and the host was told.
  await expect.poll(() => lastReported(page)).toBeGreaterThan(homeHeight);

  await frame
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Help center" })
    .click();
  await expect(frame.getByRole("searchbox")).toBeVisible();
  await expect
    .poll(() => frameDocument(page).url())
    .toMatch(/\/help\?embed=1&hide=title,subtitle&padding=compact$/);
  // Back home it shrinks again.
  await expect.poll(() => lastReported(page)).toBe(homeHeight);
});

test("a frame that starts taller than its content is told the content's height", async ({
  page,
  baseURL,
}) => {
  await page.goto("/robots.txt");
  // The host leaves the frame's height alone and only records what it is told.
  await page.setContent(`
    <iframe id="help" title="Help" style="width: 100%; height: 800px; border: 0"
      src="${baseURL ?? ""}/help?embed=1&hide=title,subtitle,collections,popular"></iframe>
    <script>
      window.reported = [];
      window.addEventListener("message", (event) => {
        if (event.data?.type === "help-height") window.reported.push(event.data.height);
      });
    </script>`);
  const frame = page.frameLocator("#help");
  await expect(frame.getByRole("searchbox")).toBeVisible();

  await expect.poll(() => lastReported(page)).toBeGreaterThan(0);
  const height = await lastReported(page);
  const content = await frameDocument(page).evaluate(() =>
    Math.ceil(document.getElementById("help-embed")?.getBoundingClientRect().height ?? 0),
  );
  expect(height).toBe(content);
  expect(height).toBeLessThan(300);
});

test("the embed fits a narrow container without scrolling sideways", async ({ page, baseURL }) => {
  const frame = await host(
    page,
    baseURL ?? "",
    "embed=1&padding=none&bg=transparent",
    "width: 320px",
  );
  await expect(frame.getByRole("link", { name: CARD })).toBeVisible();
  const overflow = await frameDocument(page).evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const background = await frameDocument(page).evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(background).toBe("rgba(0, 0, 0, 0)");

  await frame.getByRole("link", { name: CARD }).click();
  await frame.getByRole("link", { name: /Add the chat to your website/ }).click();
  await expect(frame.getByRole("heading", { level: 1 })).toBeVisible();
  const articleOverflow = await frameDocument(page).evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(articleOverflow).toBeLessThanOrEqual(0);
});

test("a host matches its theme", async ({ page, baseURL }) => {
  await host(page, baseURL ?? "", "embed=1&theme=dark");
  await expect
    .poll(() =>
      frameDocument(page).evaluate(() => document.documentElement.classList.contains("dark")),
    )
    .toBe(true);
});

test("an admin builds the embed snippet with only the parts they want", async ({
  page,
  baseURL,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/installation");

  const preview = page.frameLocator('iframe[title="Help center preview"]');
  await expect(preview.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("checkbox", { name: "Subtitle" }).click();
  await page.getByRole("checkbox", { name: "Popular articles" }).click();
  await page.getByRole("checkbox", { name: "Breadcrumbs" }).click();
  await expect(page.getByRole("checkbox", { name: "Subtitle" })).not.toBeChecked();

  // The preview shows what the snippet will.
  await expect(page.locator('iframe[title="Help center preview"]')).toHaveAttribute(
    "src",
    "/help?embed=1&hide=subtitle,popular,breadcrumbs",
  );
  await expect(preview.getByRole("searchbox")).toBeVisible();
  await expect(preview.getByRole("link", { name: CARD })).toBeVisible();

  const embedCode = page.getByRole("tabpanel").filter({ hasText: "help-height" });
  await expect(embedCode).toContainText(
    `src="${baseURL ?? ""}/help?embed=1&hide=subtitle,popular,breadcrumbs"`,
  );
  await expect(embedCode).toContainText(`event.origin !== "${baseURL ?? ""}"`);

  await page
    .getByRole("tablist", { name: "Embed code" })
    .getByRole("tab", { name: "Script" })
    .click();
  await expect(page.getByRole("tabpanel").filter({ hasText: "embedHelp" })).toContainText(
    'hide: ["subtitle", "popular", "breadcrumbs"]',
  );
});

import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";

import { database, newTeamMember } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// The dashboard as an installable app: its manifest, service worker, update offer, install
// banner and push subscription. Each test signs in a team member of its own, so nothing here
// touches the demo's people. Runs against the local Supabase stack.
let member: Awaited<ReturnType<typeof newTeamMember>>;

test.beforeAll(async () => {
  member = await newTeamMember("Ines Install");
});

test.afterAll(async () => {
  // Their browsers' subscriptions go with them.
  await member.remove();
});

/**
 * The scope of the dashboard's service worker, once it is active. Signing in moves to the
 * dashboard without loading a new page, so this asks for the registration rather than waiting
 * for `navigator.serviceWorker.ready`, which follows the page the tab first opened.
 */
async function workerScope(page: Page) {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/dashboard");
    return registration?.active !== null && registration?.active !== undefined;
  });
  return page.evaluate(
    async () => (await navigator.serviceWorker.getRegistration("/dashboard"))?.scope,
  );
}

/**
 * Stands in for the browser's push service, which a test browser cannot reach (Chromium for
 * Testing has none, and Chrome has none in a fresh profile like a test's): subscribing
 * gives a subscription with an address of this run's own, as Chrome would give one of Google's.
 * Everything else, from the permission to the saved row, is the app's real path.
 */
async function fakePushService(context: BrowserContext) {
  await context.addInitScript(() => {
    type Fake = Pick<PushSubscription, "endpoint" | "options" | "toJSON" | "unsubscribe">;
    let current: Fake | null = null;
    PushManager.prototype.subscribe = function subscribe(options) {
      const endpoint = `https://push.example.test/e2e/${crypto.randomUUID()}`;
      const fake: Fake = {
        endpoint,
        options: {
          applicationServerKey: (options?.applicationServerKey ?? null) as ArrayBuffer | null,
          userVisibleOnly: true,
        },
        toJSON: () => ({ endpoint, keys: { p256dh: "BE2E-p256dh", auth: "e2e-auth" } }),
        unsubscribe: () => {
          current = null;
          return Promise.resolve(true);
        },
      };
      current = fake;
      return Promise.resolve(fake as PushSubscription);
    };
    PushManager.prototype.getSubscription = function getSubscription() {
      return Promise.resolve(current as PushSubscription | null);
    };
    // Headless Chromium reports notifications as denied even once the test has granted them.
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
  });
}

/** Whether any service worker would control a page at this address. */
async function hasWorker(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration(window.location.href);
    return registration !== undefined || navigator.serviceWorker.controller !== null;
  });
}

test("the manifest names the brand, opens the inbox and has icons that load", async ({
  request,
}) => {
  const response = await request.get("/dashboard/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");

  const { data: brand } = await database
    .from("settings")
    .select("value")
    .eq("key", "brand")
    .single();
  const brandName = (brand?.value as { name: string }).name;
  const manifest = (await response.json()) as {
    name: string;
    short_name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({
    name: `${brandName} Support`,
    short_name: brandName,
    start_url: "/dashboard/inbox",
    display: "standalone",
  });
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
    "192x192 any",
    "512x512 any",
    "512x512 maskable",
  ]);
  for (const src of [...manifest.icons.map((icon) => icon.src), "/icons/apple-touch-icon.png"]) {
    const icon = await request.get(src);
    expect(icon.ok(), src).toBe(true);
    expect(icon.headers()["content-type"]).toBe("image/png");
  }
});

test("the service worker serves the dashboard and stays away from the help center and widget", async ({
  page,
}) => {
  await signInToInbox(page, member.email);
  await expect(page.locator("link[rel='manifest']")).toHaveAttribute(
    "href",
    "/dashboard/manifest.webmanifest",
  );
  expect(await workerScope(page)).toMatch(/\/dashboard$/);

  await page.goto("/help");
  await expect(page.locator("link[rel='manifest']")).toHaveCount(0);
  expect(await hasWorker(page)).toBe(false);

  await page.goto("/embed");
  expect(await hasWorker(page)).toBe(false);

  await page.goto("/chat");
  expect(await hasWorker(page)).toBe(false);
});

test("a new deploy offers an update, and Update reloads the page", async ({ page }) => {
  await signInToInbox(page, member.email);
  await workerScope(page);

  // The server now says it runs another build.
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { status: "ok", version: "9.9.9+e2e" } }),
  );
  await page.reload();
  await page.evaluate(() => {
    (window as Window & { beforeUpdate?: boolean }).beforeUpdate = true;
  });

  const toast = page.getByText("A new version of Helpwren is ready");
  await expect(toast).toBeVisible();
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForFunction(
    () => !(window as Window & { beforeUpdate?: boolean }).beforeUpdate,
    undefined,
    { timeout: 15_000 },
  );
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
});

test("settings show the version and check for updates", async ({ page, request }) => {
  await signInToInbox(page, member.email);
  await page.goto("/dashboard/settings/app");
  const { version } = (await (await request.get("/api/health")).json()) as { version: string };

  await expect(page.getByRole("heading", { name: "App" })).toBeVisible();
  await expect(page.getByTestId("app-version")).toHaveText(version);
  await page.getByRole("button", { name: "Check for updates" }).click();
  await expect(page.getByText("You're on the latest version.")).toBeVisible();
  await expect(page.getByText("Not installed.")).toBeVisible();
});

test.describe("on a phone", () => {
  test("an iPhone is shown how to add the app, and Not now keeps it away", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await signInToInbox(page, member.email);

    const banner = page.getByRole("region", { name: "Install the app" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Share, then Add to Home Screen");
    await banner.getByRole("button", { name: "Not now" }).click();
    await expect(banner).toBeHidden();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expect(banner).toBeHidden();
    await context.close();
  });

  test("Android offers the browser's install dialog", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Pixel 7"],
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await signInToInbox(page, member.email);

    // Chrome offers to install a site only once it judges it worth it, which a test browser
    // never does; the offer is made here as Chrome would make it.
    await page.evaluate(() => {
      const offer = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(offer);
    });
    const banner = page.getByRole("region", { name: "Install the app" });
    await expect(banner.getByRole("button", { name: "Install" })).toBeVisible();

    // Turning it down counts as Not now.
    await banner.getByRole("button", { name: "Install" }).click();
    await expect(banner).toBeHidden();
    await context.close();
  });
});

test("turning on desktop notifications subscribes this browser to pushes", async ({ browser }) => {
  const context = await browser.newContext();
  await context.grantPermissions(["notifications"]);
  await fakePushService(context);
  const page = await context.newPage();
  await signInToInbox(page, member.email);
  await page.goto("/dashboard/settings/notifications");

  await page.getByRole("switch", { name: "Desktop notifications" }).click();
  await expect(page.getByText("This device gets them even with Helpwren closed.")).toBeVisible({
    timeout: 20_000,
  });
  await expect
    .poll(async () => {
      const { count } = await database
        .from("agent_push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", member.id);
      return count;
    })
    .toBe(1);

  // Turning it off forgets this browser.
  await page.getByRole("switch", { name: "Desktop notifications" }).click();
  await expect(page.getByText("This device gets them only while Helpwren is open.")).toHaveCount(0);
  await expect
    .poll(async () => {
      const { count } = await database
        .from("agent_push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", member.id);
      return count;
    })
    .toBe(0);
  await context.close();
});

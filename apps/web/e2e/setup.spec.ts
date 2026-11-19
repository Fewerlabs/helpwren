import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { markMailbox, readSignInCode } from "./support/mailbox";

// The wizard only opens on an install with nobody on its team, which the demo data is not.
// Run this against a fresh database, as docs/install.md describes:
//   E2E_PORT=3170 MAILPIT_URL=http://127.0.0.1:55424 pnpm test:e2e setup.spec.ts
const ADMIN = { name: "Rosa Diaz", email: "rosa.setup@example.com" };

// A customer's site on another origin, with the HTML snippet the widget step shows pasted in.
// A real server, because Chrome only lets a page on a local address load the widget from one.
let site: Server | undefined;
let siteUrl: string;

test.beforeAll(async ({ baseURL }) => {
  const { count } = await database.from("agents").select("user_id", { count: "exact", head: true });
  test.skip((count ?? 0) > 0, "Needs an install with no team yet; see the note above.");

  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      [
        "<!doctype html><title>Customer</title><body>",
        `<script src="${baseURL ?? ""}/widget.js"></script>`,
        '<script>Helpwren.init({ source: "web" });</script>',
      ].join("\n"),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  site = server;
  siteUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

test.afterAll(() => {
  site?.close();
});

test("a new install is set up in the browser, from the first admin to a live widget", async ({
  page,
  context,
}) => {
  const mailbox = await markMailbox(page.request, ADMIN.email);

  // With nobody on the team, sign-in sends people to set up.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByLabel("Your name").fill(ADMIN.name);
  await page.getByLabel("Work email").fill(ADMIN.email);
  await page.getByRole("button", { name: "Create admin and email me a code" }).click();
  await expect(page.getByRole("heading", { name: `Sign in, ${ADMIN.name}` })).toBeVisible();
  await page.getByLabel("Sign-in code").fill(await readSignInCode(page.request, mailbox));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Brand.
  await expect(page).toHaveURL(/\/setup\?step=brand$/);
  await page.getByLabel("Brand name").fill("Acme Support");
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Email: nothing to change on a test install.
  await expect(page).toHaveURL(/\/setup\?step=email$/);
  await page.getByRole("button", { name: "Continue" }).click();

  // The widget: waiting until it loads on a site, then saying where.
  await expect(page).toHaveURL(/\/setup\?step=widget$/);
  await expect(page.getByText("Waiting for the widget on your site")).toBeVisible();

  const customer = await context.newPage();
  await customer.goto(siteUrl);
  await expect(customer.getByRole("button", { name: "Open chat" })).toBeVisible();
  await expect(page.getByText(`Seen on ${new URL(siteUrl).host} just now`)).toBeVisible({
    timeout: 15_000,
  });
  await customer.close();

  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "Helpwren is ready" })).toBeVisible();

  // The brand was saved, and the wizard is closed for good.
  const { data } = await database.from("settings").select("value").eq("key", "brand").single();
  expect(data?.value).toMatchObject({ name: "Acme Support" });
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/dashboard\/inbox$/);
});

test("once set up, nobody else can become the first admin", async ({ browser }) => {
  const stranger = await browser.newPage();
  await stranger.goto("/setup");
  // Sent on to the dashboard, which sends someone with no session to sign in.
  await expect(stranger).toHaveURL(/\/login$/);
  await expect(
    stranger.getByRole("button", { name: "Create admin and email me a code" }),
  ).toHaveCount(0);
  await stranger.close();
});

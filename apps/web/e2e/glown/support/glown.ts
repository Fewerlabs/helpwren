import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { type Database } from "@helpwren/core";
import { expect, test, type Browser, type FrameLocator, type Page } from "@playwright/test";
import { type HelpwrenWidget } from "helpwren";
import { SignJWT } from "jose";

import { database, removeContactByEmail, RUN, uniqueEmail } from "../../support/database";
import { signInToInbox } from "../../support/mailbox";
import { EXAMPLE_PORT, GLOWN_JWT_SECRET, SITE, WEB_APP } from "./hosts";

export { ELSEWHERE, SITE, WEB_APP } from "./hosts";

declare global {
  interface Window {
    /** Defined by the install's widget.js on the public site. */
    Helpwren?: HelpwrenWidget;
  }
}

/** Glown's coral and yellow, from its logo. */
export const GLOWN_BRAND = { name: "Glown", accent: "#f1635e", accentTo: "#ffcb05" };
/** Glown's icon, when examples/nextjs has copied the brand files in. Not in the repository. */
const GLOWN_ICON = "../../examples/nextjs/public/brand/glown-icon.png";
/** The demo agent the specs write as when the dashboard is not what is being tested. */
export const DEMO_AGENT_ID = "a0000000-0000-4000-8000-000000000002";
export const AGENT = "sam@example.com";
const ADMIN = "ada@example.com";

/**
 * The settings this suite changes, and whether a visitor may read each. Saving Branding in
 * the dashboard writes the widget's and the chat page's too, so they are kept and put back.
 */
const SETTINGS = {
  brand: true,
  help_center: true,
  allowed_domains: false,
  identity: false,
  widget: true,
  chat_page: true,
} as const;
type SettingKey = keyof typeof SETTINGS;
type SettingRow = Database["public"]["Tables"]["settings"]["Row"];

/** What Glown's profile endpoint was called with, through a spy in front of it. */
export interface ProfileEndpointSpy {
  /** Every token the install sent, oldest first. */
  tokens: string[];
}

/** Puts a spy in front of the example's `/api/me`, so a spec can see what the install sent. */
async function startSpy(spy: ProfileEndpointSpy): Promise<Server> {
  const server = createServer((request, response) => {
    const authorization = request.headers.authorization ?? "";
    spy.tokens.push(authorization.replace(/^Bearer /, ""));
    void fetch(`http://127.0.0.1:${EXAMPLE_PORT}/api/me`, { headers: { authorization } })
      .then(async (answer) => {
        response
          .writeHead(answer.status, { "content-type": "application/json" })
          .end(await answer.text());
      })
      .catch(() => {
        response.writeHead(502).end();
      });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

/**
 * Saves Settings > Branding as an admin, after `change`. Saving there is also what tells the
 * help center to stop using the brand it keeps for a minute.
 */
async function saveBranding(browser: Browser, change: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await signInToInbox(page, ADMIN);
  await page.goto("/dashboard/settings/branding");
  await change(page);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await context.close();
}

/** Fills in the help center's public address, on the Branding page. */
function setPublicAddress(address: string) {
  return async (page: Page) => {
    await page.getByRole("tab", { name: "Help center" }).click();
    await page.getByLabel("Public address").fill(address);
  };
}

/**
 * Sets the install up the way Glown's is for the specs in one file, and puts back what was
 * there afterwards: Glown's brand, the help center at the public site's /help, the two
 * hostnames as allowed domains, and users recognised through Glown's profile endpoint.
 *
 * With `helpCenter`, the help center's public address is set the way an admin sets it, in
 * Settings > Branding, so the help center shows the change at once; and saved again at the
 * end, so the specs after these do not see Glown's brand on it.
 */
export function setUpGlownInstall({ helpCenter = false } = {}): ProfileEndpointSpy {
  const spy: ProfileEndpointSpy = { tokens: [] };
  let saved: Pick<SettingRow, "key" | "value" | "is_public">[] = [];
  let server: Server | undefined;
  let logo: string | undefined;

  test.beforeAll(async ({ browser }) => {
    const { data } = await database
      .from("settings")
      .select("key, value, is_public")
      .in("key", Object.keys(SETTINGS));
    saved = data ?? [];

    server = await startSpy(spy);
    const { port } = server.address() as AddressInfo;

    // The logo goes where the Branding page puts one, when Glown's files are here to use.
    const icon = await readFile(GLOWN_ICON).catch(() => undefined);
    let logoUrl: string | undefined;
    if (icon) {
      logo = `logo-glown-${RUN}.png`;
      const bucket = database.storage.from("brand");
      const { error } = await bucket.upload(logo, icon, { contentType: "image/png" });
      if (error) throw error;
      logoUrl = bucket.getPublicUrl(logo).data.publicUrl;
    }

    const host = (url: string) => new URL(url).host;
    const values: Partial<Record<SettingKey, SettingRow["value"]>> = {
      brand: { ...GLOWN_BRAND, ...(logoUrl ? { logo: logoUrl } : {}) },
      ...(helpCenter ? {} : { help_center: { url: `${SITE}/help` } }),
      allowed_domains: [host(SITE), host(WEB_APP)],
      identity: {
        mode: "profile_endpoint",
        endpoint: {
          url: `http://127.0.0.1:${port}/me`,
          fields: {
            id: "data.id",
            name: ["data.firstName", "data.lastName"],
            email: "data.email",
            orgId: "data.business.id",
            orgName: "data.business.name",
            audience: "data.type",
          },
          audiences: { Business: "business" },
          attributes: { Plan: "data.business.plan" },
        },
      },
    };
    const { error } = await database.from("settings").upsert(
      Object.entries(values).map(([key, value]) => ({
        key,
        value,
        is_public: SETTINGS[key as SettingKey],
      })),
    );
    if (error) throw error;

    if (helpCenter) {
      await saveBranding(browser, setPublicAddress(`${SITE}/help`));
    }
  });

  async function restore() {
    await database.from("settings").delete().in("key", Object.keys(SETTINGS));
    if (saved.length > 0) {
      await database.from("settings").upsert(saved);
    }
  }

  test.afterAll(async ({ browser }) => {
    if (helpCenter) {
      // Taken off the way it was set, which clears what the help center keeps. The rest is
      // then put back exactly as it was, since saving writes settings that were left unset.
      await saveBranding(browser, setPublicAddress(""));
    }
    await restore();
    if (logo) await database.storage.from("brand").remove([logo]);
    server?.close();
  });

  return spy;
}

/** A Glown business user this run makes, with an address no other run will use. */
export function newGlownUser(firstName: string, plan: "starter" | "pro" = "pro") {
  return {
    firstName,
    lastName: `Tester ${RUN}`,
    email: uniqueEmail(firstName.toLowerCase()),
    password: "glown-e2e-password",
    businessName: `${firstName}'s Salon ${RUN}`,
    plan,
  };
}
export type GlownUser = ReturnType<typeof newGlownUser>;

/** Creates the account on the web app, which logs them in. */
export async function signUp(page: Page, user: GlownUser) {
  await page.goto(`${WEB_APP}/signup`);
  await page.getByLabel("First name").fill(user.firstName);
  await page.getByLabel("Last name").fill(user.lastName);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByLabel("Business name").fill(user.businessName);
  await page.getByLabel("Plan").selectOption(user.plan);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
}

export async function logIn(page: Page, email: string, password: string) {
  await page.goto(`${WEB_APP}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
}

/** What the web app shows from the widget's `identity` event. */
export function supportStatus(page: Page) {
  return page.getByRole("status", { name: "Support sign-in" });
}

/** The access token the web app would hand to the widget now. */
export async function currentToken(page: Page): Promise<string> {
  const response = await page.request.get(`${WEB_APP}/api/auth/token`);
  expect(response.ok()).toBe(true);
  return response.text();
}

/** The claims of a JWT, read without checking it. */
export function claimsOf(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(payload, "base64url").toString()) as Record<string, unknown>;
}

/** A token Glown's API made for this user an hour ago, which has since run out. */
export function expiredToken(userId: string, email: string): Promise<string> {
  const anHourAgo = Math.floor(Date.now() / 1000) - 3600;
  return new SignJWT({ userId, type: "Business", email, av: 0 })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(anHourAgo - 900)
    .setExpirationTime(anHourAgo)
    .sign(new TextEncoder().encode(GLOWN_JWT_SECRET));
}

export function chatOf(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Chat"]');
}

/** Writes a first message as a guest, from a chat that is already open. */
export async function writeAsGuest(
  chat: FrameLocator,
  guest: { name: string; email: string },
  message: string,
) {
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(guest.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(guest.email);
  await chat.getByLabel("Your message").pressSequentially(message, { delay: 10 });
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(message);
}

/** Writes a first message as a logged-in user, who is asked for nothing else. */
export async function writeAsUser(chat: FrameLocator, message: string) {
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await expect(chat.getByLabel("Your name")).toHaveCount(0);
  await chat.getByLabel("Your message").pressSequentially(message, { delay: 10 });
  // By keyboard: with so short a form, the dev server's own badge can sit over the button.
  await chat.getByRole("button", { name: "Send message" }).press("Enter");
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(message);
}

/** The contact the install made for a Glown user, by the email their profile gave. */
export async function contactOf(email: string) {
  const { data } = await database
    .from("contacts")
    .select(
      "id, kind, verified, name, email, external_id, org_id, org_name, audience, attributes, conversations(id, last_message_preview, context)",
    )
    .eq("email", email)
    .maybeSingle();
  return data;
}

/** Removes the people a spec made, guests and users, with their conversations. */
export async function removePeople(emails: readonly string[]) {
  for (const email of emails) await removeContactByEmail(email);
}

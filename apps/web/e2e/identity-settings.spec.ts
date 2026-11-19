import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { expect, test, type Page } from "@playwright/test";
import { type HelpwrenWidget, type IdentityState } from "helpwren";
import { SignJWT } from "jose";
import { z } from "zod";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// An admin sets up how the install recognises a product's logged-in users, from Settings, and
// a site then identifies a visitor that way. Runs against the local Supabase stack, where Ada is
// an admin and Sam is an agent, with the example site on another origin.
const SITE = "http://127.0.0.1:4100/";
const run = crypto.randomUUID();
const userId = (name: string) => `e2e-${run}-${name}`;

declare global {
  interface Window {
    Helpwren?: HelpwrenWidget;
  }
}

async function restore() {
  await database.from("settings").delete().eq("key", "identity");
  await database.from("secrets").delete().eq("key", "identity_keys");
  const { data } = await database.from("contacts").select("id").like("external_id", `e2e-${run}-%`);
  for (const { id } of data ?? []) {
    await database.from("conversations").delete().eq("contact_id", id);
    await database.auth.admin.deleteUser(id);
  }
}

test.beforeEach(restore);
test.afterEach(restore);

/** Identifies the visitor on the example site, and resolves with what the chat answered. */
async function identifyOnSite(page: Page, token: string): Promise<IdentityState> {
  await page.goto(SITE);
  return page.evaluate(
    (given) =>
      new Promise<IdentityState>((resolve) => {
        window.Helpwren?.on("identity", resolve);
        window.Helpwren?.identify({ token: given });
      }),
    token,
  );
}

async function openIdentity(page: Page) {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/identity");
}

test("an admin makes a signing key, tests a token, and a site signs a user in with it", async ({
  page,
  browser,
}) => {
  await openIdentity(page);
  await page.getByRole("radio", { name: "Signed token, from your server" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  // The secret is shown once, when the key is made.
  await page.getByRole("button", { name: "Make a signing key" }).click();
  const shown = page.getByRole("status").filter({ hasText: "It will not be shown again" });
  await expect(shown).toBeVisible();
  const { data: stored } = await database
    .from("secrets")
    .select("value")
    .eq("key", "identity_keys")
    .single();
  const [key] = z.array(z.object({ id: z.string(), secret: z.string() })).parse(stored?.value);
  if (!key) throw new Error("No key was stored.");
  await expect(shown).toContainText(key.secret);
  await expect(page.getByRole("list", { name: "Signing keys" })).toContainText(key.id);

  // The admin's backend signs a token with it; the page says who the token is for.
  const token = await new SignJWT({ name: "Lina Okoro" })
    .setProtectedHeader({ alg: "HS256", kid: key.id })
    .setSubject(userId("lina"))
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(key.secret));
  await page.getByLabel("Token to test").fill(token);
  await page.getByRole("button", { name: "Test token" }).click();
  const result = page.getByRole("status", { name: "Test result" });
  await expect(result).toContainText("Accepted");
  await expect(result).toContainText("Lina Okoro");

  // A site signs its user in with a token like it.
  const site = await (await browser.newContext()).newPage();
  await expect(identifyOnSite(site, token)).resolves.toEqual({ state: "user" });

  // Removing the key turns its tokens away at once.
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Remove key" }).click();
  await expect(page.getByText("No keys yet.")).toBeVisible();
  await expect(identifyOnSite(site, token)).resolves.toEqual({
    state: "failed",
    reason: "off",
  });
  await site.context().close();
});

test("an admin connects the product's profile endpoint, and its users are recognised", async ({
  page,
  browser,
}) => {
  // The host product: answers for one token, as its own "who am I" address would.
  const product: Server = createServer((request, response) => {
    if (request.headers.authorization !== "Bearer users-own-token") {
      response.writeHead(401).end();
      return;
    }
    response.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        status: "success",
        data: { id: userId("omar"), firstName: "Omar", lastName: "Haddad", type: "Business" },
      }),
    );
  });
  await new Promise<void>((resolve) => {
    product.listen(0, "127.0.0.1", resolve);
  });
  const { port } = product.address() as AddressInfo;

  try {
    await openIdentity(page);
    await page.getByRole("radio", { name: "Your product's profile endpoint" }).click();
    await page.getByLabel("Profile address").fill(`http://127.0.0.1:${String(port)}/me`);
    await page.getByLabel("User id").fill("data.id");
    await page.getByLabel("Name", { exact: true }).fill("data.firstName, data.lastName");
    await page.getByLabel("Audience", { exact: true }).fill("data.type");
    await page.getByLabel("Audience values").fill("Business = business");

    // Tried before it is saved.
    await page.getByLabel("Token to test").fill("users-own-token");
    await page.getByRole("button", { name: "Test token" }).click();
    const result = page.getByRole("status", { name: "Test result" });
    await expect(result).toContainText("Omar Haddad");
    await expect(result).toContainText("business");
    await page.getByLabel("Token to test").fill("someone-elses-token");
    await page.getByRole("button", { name: "Test token" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "did not accept" })).toBeVisible();

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

    // The site hands over the token its user already has, and the chat signs them in.
    const site = await (await browser.newContext()).newPage();
    await expect(identifyOnSite(site, "users-own-token")).resolves.toEqual({ state: "user" });
    const { data } = await database
      .from("contacts")
      .select("name, verified, audience")
      .eq("external_id", userId("omar"))
      .single();
    expect(data).toEqual({ name: "Omar Haddad", verified: true, audience: "business" });
    await site.context().close();
  } finally {
    product.close();
  }
});

test("an agent who is not an admin sees how users are identified, and changes nothing", async ({
  page,
}) => {
  await database.from("settings").upsert({ key: "identity", value: { mode: "signed_token" } });
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/identity");

  await expect(page.getByText("Only admins can change these.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Signed token, from your server" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Make a signing key" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(page.getByLabel("Token to test")).toHaveCount(0);
});

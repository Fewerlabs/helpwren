import { expect, test, type Page } from "@playwright/test";
import { type HelpwrenWidget, type Identity, type IdentityState } from "helpwren";
import { SignJWT } from "jose";

import { database, removeContactByEmail } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// A site telling the chat who its visitor is: examples/plain-html, on another origin than the
// app, calling the widget as a product's own pages would. The install is set up to accept
// signed tokens for the length of these tests.
const SITE = "http://127.0.0.1:4100/";
const KEY = { id: "e2e", secret: "e2e-signing-secret-e2e-signing-secret" };
const AGENT = "sam@example.com";
const GUEST = { name: "Noor Haddad", email: "noor.e2e@example.org" };

declare global {
  interface Window {
    /** Defined by the widget script the example site loads. */
    Helpwren?: HelpwrenWidget;
  }
}

const run = crypto.randomUUID();
const userId = (name: string) => `e2e-${run}-${name}`;

function tokenFor(name: string, claims: Record<string, unknown> = {}) {
  return new SignJWT({ sub: userId(name), ...claims })
    .setProtectedHeader({ alg: "HS256", kid: KEY.id })
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(KEY.secret));
}

/** Calls the widget on the page, as the site's own script would. */
function identify(page: Page, identity: Identity) {
  return page.evaluate((who) => {
    window.Helpwren?.identify(who);
  }, identity);
}

function chatOf(page: Page) {
  return page.frameLocator('iframe[title="Chat"]');
}

async function openMessages(page: Page) {
  await page.getByRole("button", { name: "Open chat" }).click();
  await chatOf(page).getByRole("button", { name: "Messages" }).click();
}

async function removeUsers() {
  const { data } = await database.from("contacts").select("id").like("external_id", `e2e-${run}-%`);
  for (const { id } of data ?? []) {
    await database.from("conversations").delete().eq("contact_id", id);
    await database.auth.admin.deleteUser(id);
  }
}

test.beforeAll(async () => {
  await database.from("settings").upsert({ key: "identity", value: { mode: "signed_token" } });
  await database.from("secrets").upsert({ key: "identity_keys", value: [KEY] });
});

test.afterAll(async () => {
  await database.from("settings").delete().eq("key", "identity");
  await database.from("secrets").delete().eq("key", "identity_keys");
});

test.afterEach(async () => {
  await removeContactByEmail(GUEST.email);
  await removeUsers();
});

test("a guest keeps their conversation when they log in, and finds it on another device", async ({
  page,
  browser,
}) => {
  // They start as a guest.
  await page.goto(SITE);
  await page.getByRole("button", { name: "Open chat" }).click();
  const chat = chatOf(page);
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(GUEST.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(GUEST.email);
  await chat.getByLabel("Your message").fill("Can I move my booking?");
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText("Can I move my booking?");

  // Then they log in to the site, which tells the chat who they are.
  const token = await tokenFor("noor", { name: "Noor Haddad" });
  await identify(page, { token });
  await expect
    .poll(async () => {
      const { data } = await database
        .from("contacts")
        .select("verified, conversations(last_message_preview)")
        .eq("external_id", userId("noor"))
        .maybeSingle();
      return data;
    })
    .toEqual({
      verified: true,
      conversations: [{ last_message_preview: "Can I move my booking?" }],
    });
  // The conversation they were in is still open in front of them, and still theirs to write in.
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText("Can I move my booking?");
  const box = chat.getByRole("textbox", { name: "Your message" });
  await box.fill("I am logged in now.");
  await box.press("Enter");
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText("I am logged in now.");

  // On another device, logging in brings the same conversation.
  const other = await browser.newContext();
  const laptop = await other.newPage();
  await laptop.goto(SITE);
  await identify(laptop, { token: await tokenFor("noor") });
  await openMessages(laptop);
  await expect(chatOf(laptop).getByText("I am logged in now.")).toBeVisible();

  // Logging out there empties the chat on that device.
  await laptop.evaluate(() => {
    window.Helpwren?.reset();
  });
  await expect(chatOf(laptop).getByText("I am logged in now.")).toBeHidden();
  await other.close();

  // A page that no longer vouches for them shows a guest's chat, even on the first device.
  await page.reload();
  await openMessages(page);
  await expect(
    chatOf(page).getByRole("button", { name: "Send us a message" }).first(),
  ).toBeVisible();
  await expect(chatOf(page).getByText("I am logged in now.")).toBeHidden();
});

test("a logged-in user writes without saying who they are, and the team sees them as verified", async ({
  browser,
}) => {
  const agentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const inbox = await agentContext.newPage();
  await signInToInbox(inbox, AGENT);
  const list = inbox.getByRole("list", { name: "Conversations" });
  await expect(list.getByRole("listitem").first()).toBeVisible();

  // The site knows who is logged in, and what they are looking at.
  const site = await (await browser.newContext()).newPage();
  await site.goto(SITE);
  const signedIn = site.evaluate(
    () =>
      new Promise<IdentityState>((resolve) => {
        window.Helpwren?.on("identity", resolve);
      }),
  );
  await identify(site, {
    token: await tokenFor("ines", {
      name: "Ines Marchetti",
      email: "ines.e2e@example.org",
      org: { id: `e2e-${run}-org`, name: "Marchetti Studio" },
    }),
  });
  await site.evaluate(() => {
    window.Helpwren?.setContext({ plan: "pro" });
  });
  await expect(signedIn).resolves.toEqual({ state: "user" });

  // They are asked for a message and nothing else.
  await site.getByRole("button", { name: "Open chat" }).click();
  const chat = chatOf(site);
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await expect(chat.getByLabel("Your name")).toHaveCount(0);
  await chat.getByLabel("Your message").fill("My invoice shows the wrong plan.");
  // By keyboard: with so short a form, the dev server's own badge sits over the button.
  await chat.getByRole("button", { name: "Send message" }).press("Enter");
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(
    "My invoice shows the wrong plan.",
  );

  // The team sees who it is on the host product's word, and what the page said.
  const row = list.getByRole("button", { name: /Ines Marchetti/ });
  await expect(row).toContainText("My invoice shows the wrong plan.");
  await row.click();
  const details = inbox.getByRole("region", { name: "Details" });
  await expect(details.getByText("Verified user")).toBeVisible();
  await expect(details.getByText("ines.e2e@example.org")).toBeVisible();
  await expect(details.getByText("pro", { exact: true })).toBeVisible();

  await agentContext.close();
  await site.context().close();
});

test("a token the install did not sign leaves the visitor a guest, and tells the page", async ({
  page,
}) => {
  await page.goto(SITE);
  const heard = page.evaluate(
    () =>
      new Promise<IdentityState>((resolve) => {
        window.Helpwren?.on("identity", resolve);
      }),
  );
  const forged = await new SignJWT({ sub: userId("mallory") })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode("not-the-install's-secret-not-the-install's"));
  await identify(page, { token: forged });

  await expect(heard).resolves.toEqual({ state: "failed", reason: "rejected" });
  const { data } = await database
    .from("contacts")
    .select("id")
    .eq("external_id", userId("mallory"));
  expect(data).toEqual([]);
});

test("details given without a token label the conversation and unlock nothing", async ({
  page,
}) => {
  await page.goto(SITE);
  await identify(page, { id: "42", name: GUEST.name, email: GUEST.email });
  await page.evaluate(() => {
    window.Helpwren?.setContext({ plan: "pro", orderId: 1234 });
  });

  await page.getByRole("button", { name: "Open chat" }).click();
  const chat = chatOf(page);
  await chat.getByRole("button", { name: "Send us a message" }).click();
  // Who they are is filled in for them.
  await expect(chat.getByLabel("Your name")).toHaveValue(GUEST.name);
  await expect(chat.getByRole("textbox", { name: "Email" })).toHaveValue(GUEST.email);
  await chat.getByLabel("Your message").fill("Which plan am I on?");
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText("Which plan am I on?");

  const { data } = await database
    .from("contacts")
    .select("kind, verified, external_id, conversations(context)")
    .eq("email", GUEST.email)
    .single();
  expect(data).toMatchObject({
    kind: "guest",
    verified: false,
    external_id: null,
    conversations: [{ context: { custom: { plan: "pro", orderId: 1234, claimedUserId: "42" } } }],
  });
});

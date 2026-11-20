import { expect, test, type Page } from "@playwright/test";
import { type IdentityState } from "helpwren";

import { RUN, uniqueEmail } from "../support/database";
import { signInToInbox } from "../support/mailbox";
import {
  AGENT,
  chatOf,
  claimsOf,
  contactOf,
  currentToken,
  expiredToken,
  logIn,
  newGlownUser,
  removePeople,
  signUp,
  SITE,
  supportStatus,
  setUpGlownInstall,
  WEB_APP,
  writeAsGuest,
  writeAsUser,
} from "./support/glown";

// Glown's users, recognised the way Glown's install does it: the web app hands the widget a
// function that returns the user's own Glown JWT, and the install asks Glown's "who am I"
// address (the profile endpoint) whose it is. A spy in front of that address shows what the
// install sent.
const spy = setUpGlownInstall();

const made: string[] = [];
test.afterEach(async () => {
  await removePeople(made.splice(0));
});

/** Opens the chat from the web app's own Help button, on the Messages tab. */
async function openMessages(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  await chatOf(page).getByRole("button", { name: "Messages" }).click();
}

test("a guest on the public site logs in on the web app and keeps the conversation, on every device", async ({
  page,
  browser,
}) => {
  const user = newGlownUser("Ngozi");
  const guest = { name: `Ngozi as a guest ${RUN}`, email: uniqueEmail("ngozi.guest") };
  made.push(user.email, guest.email);

  // Before having an account, on glown.io.
  await page.goto(SITE);
  await page.getByRole("button", { name: "Open chat" }).click();
  await writeAsGuest(chatOf(page), guest, "Can my salon take deposits?");

  // Then they sign up on app.glown.io, the same site, and the chat there has their guest
  // conversation, now under their verified account.
  await signUp(page, user);
  await expect(supportStatus(page)).toHaveText("Support knows it is you.");
  await expect
    .poll(async () => {
      const contact = await contactOf(user.email);
      return contact && { verified: contact.verified, conversations: contact.conversations };
    })
    .toMatchObject({
      verified: true,
      conversations: [{ last_message_preview: "Can my salon take deposits?" }],
    });
  await openMessages(page);
  await expect(chatOf(page).getByText("Can my salon take deposits?")).toBeVisible();

  // On a second device, logging in brings it too.
  const laptop = await (await browser.newContext()).newPage();
  await logIn(laptop, user.email, user.password);
  await expect(supportStatus(laptop)).toHaveText("Support knows it is you.");
  await openMessages(laptop);
  await expect(chatOf(laptop).getByText("Can my salon take deposits?")).toBeVisible();
  await laptop.context().close();
});

test("the install asks Glown's profile endpoint with the user's JWT, and turns away what it refuses", async ({
  page,
  browser,
}) => {
  const user = newGlownUser("Tobi", "starter");
  made.push(user.email);
  await signUp(page, user);
  await expect(supportStatus(page)).toHaveText("Support knows it is you.");

  // The endpoint was handed the same Glown JWT the web app holds, and nothing else.
  const token = await currentToken(page);
  expect(spy.tokens).toContain(token);
  expect(claimsOf(token)).toMatchObject({ type: "Business", email: user.email });
  const contact = await contactOf(user.email);
  expect(contact).toMatchObject({
    kind: "user",
    verified: true,
    external_id: claimsOf(token).userId,
  });

  // A blocked account: Glown answers 403, and the visitor stays a guest. The page is told.
  const blocked = await (await browser.newContext()).newPage();
  await logIn(blocked, "blocked@glown.test", "glown-demo");
  await expect(supportStatus(blocked)).toHaveText(
    "Support could not confirm who you are (rejected).",
  );
  await blocked.context().close();

  // An expired token: Glown answers 401. Given as a plain string, there is nothing to ask for
  // a fresh one, so the visitor stays a guest and the page hears why.
  const site = await (await browser.newContext()).newPage();
  await site.goto(SITE);
  // The widget's script has loaded once its launcher is on the page.
  await expect(site.getByRole("button", { name: "Open chat" })).toBeVisible();
  const expired = await expiredToken(String(claimsOf(token).userId), user.email);
  const heard = await site.evaluate(
    (given) =>
      new Promise<IdentityState>((resolve) => {
        window.Helpwren?.on("identity", resolve);
        window.Helpwren?.identify({ token: given });
      }),
    expired,
  );
  expect(heard).toEqual({ state: "failed", reason: "expired" });
  await site.getByRole("button", { name: "Open chat" }).click();
  await chatOf(site).getByRole("button", { name: "Send us a message" }).click();
  await expect(chatOf(site).getByLabel("Your name")).toBeVisible();
  await site.context().close();
});

test("a token that has run out is replaced through the page's function", async ({
  page,
  context,
  browser,
}) => {
  const user = newGlownUser("Ada");
  made.push(user.email);
  await signUp(page, user);
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  await writeAsUser(chatOf(page), "Where do I see payouts?");
  const first = await currentToken(page);
  const userId = String(claimsOf(first).userId);

  // Some time later: Glown's access token has run out, and so has the chat's own session.
  const expired = await expiredToken(userId, user.email);
  await context.addCookies([{ name: "glown_access", value: expired, url: WEB_APP }]);
  const frame = page.frames().find((candidate) => candidate.url().includes("/embed"));
  await frame?.evaluate(() => {
    window.localStorage.removeItem("helpwren.session");
  });

  // On the next page, the widget asks the function for a token again; the web app refreshes
  // it, and the install signs the same user back in with the new one.
  const before = spy.tokens.length;
  await page.reload();
  await expect(supportStatus(page)).toHaveText("Support knows it is you.");
  const fresh = await currentToken(page);
  expect(fresh).not.toBe(expired);
  expect(spy.tokens.slice(before)).toContain(fresh);
  expect(spy.tokens).not.toContain(expired);
  await openMessages(page);
  await expect(chatOf(page).getByText("Where do I see payouts?")).toBeVisible();

  // When the install says a token has expired, the widget asks the function once more, and
  // uses what it gets. (With the chat loaded first, so only this asks for a token.)
  const site = await (await browser.newContext()).newPage();
  await site.goto(SITE);
  await site.getByRole("button", { name: "Open chat" }).click();
  await expect(chatOf(site).getByRole("button", { name: "Send us a message" })).toBeVisible();
  const outcome = await site.evaluate(
    ([stale, current]) =>
      new Promise<{ state: IdentityState; asked: number }>((resolve) => {
        let asked = 0;
        window.Helpwren?.on("identity", (state) => {
          resolve({ state, asked });
        });
        window.Helpwren?.identify({
          token: () => {
            asked += 1;
            return asked === 1 ? stale : current;
          },
        });
      }),
    [expired, fresh] as const,
  );
  expect(outcome).toEqual({ state: { state: "user" }, asked: 2 });
  await site.context().close();
});

test("logging out resets the chat, and the next person on that browser is a guest", async ({
  page,
}) => {
  const user = newGlownUser("Femi");
  made.push(user.email);
  await signUp(page, user);
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  await writeAsUser(chatOf(page), "Please change my business address.");
  await page.getByRole("button", { name: "Close chat" }).click();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Log in to Glown" })).toBeVisible();

  // Whoever uses this browser next sees a guest's chat, with none of Femi's conversations.
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  const chat = chatOf(page);
  await chat.getByRole("button", { name: "Messages" }).click();
  await expect(chat.getByRole("button", { name: "Send us a message" }).first()).toBeVisible();
  await expect(chat.getByText("Please change my business address.")).toHaveCount(0);
  await chat.getByRole("button", { name: "Send us a message" }).first().click();
  await expect(chat.getByLabel("Your name")).toBeVisible();
});

test("the team sees the page's context and the profile's details on the conversation", async ({
  page,
  browser,
}) => {
  const user = newGlownUser("Bisi", "pro");
  made.push(user.email);
  await signUp(page, user);
  await page.getByRole("link", { name: "Billing" }).click();
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await page.getByRole("banner").getByRole("button", { name: /^Help/ }).click();
  await writeAsUser(chatOf(page), "Why was I charged twice?");

  // The contact holds what Glown's profile said: name, email, business and plan.
  const contact = await contactOf(user.email);
  const token = await currentToken(page);
  const businessId = `biz_${String(claimsOf(token).userId).slice("usr_".length)}`;
  expect(contact).toMatchObject({
    kind: "user",
    verified: true,
    name: `${user.firstName} ${user.lastName}`,
    org_id: businessId,
    org_name: user.businessName,
    audience: "business",
    attributes: { Plan: "pro" },
    conversations: [
      {
        last_message_preview: "Why was I charged twice?",
        context: { custom: { businessId, plan: "pro", page: "billing" } },
      },
    ],
  });

  // And the team sees it beside the conversation.
  const inbox = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await signInToInbox(inbox, AGENT);
  await inbox
    .getByRole("list", { name: "Conversations" })
    .getByRole("button", { name: new RegExp(`${user.firstName} ${user.lastName}`) })
    .click();
  const details = inbox.getByRole("region", { name: "Details" });
  await expect(details.getByText("Verified user")).toBeVisible();
  await expect(details.getByText("web_app", { exact: true })).toBeVisible();
  await expect(details.getByText(businessId, { exact: true })).toBeVisible();
  await expect(details.getByText("billing", { exact: true })).toBeVisible();
  await expect(details.getByText("pro", { exact: true })).toBeVisible();
  await expect(details.getByText(user.email)).toBeVisible();
  await inbox.context().close();
});

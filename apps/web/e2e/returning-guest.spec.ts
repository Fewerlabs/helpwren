import { expect, test, type FrameLocator, type Page } from "@playwright/test";

import { database, removeContactByEmail, RUN } from "./support/database";

// A guest who leaves and comes back must find their conversation, and not be asked who they are
// again, however their browser lost the session in between. Runs in Chromium and WebKit, against
// the local Supabase stack and its demo data, which asks guests for a name and an email.
const VISITOR = { name: `Ines Moreau ${RUN}`, email: `ines.${RUN}@example.org` };
const SESSION_KEY = "helpwren.session";

test.use({ viewport: { width: 390, height: 780 } });

test.beforeEach(async () => {
  await removeContactByEmail(VISITOR.email);
});
test.afterEach(async () => {
  await removeContactByEmail(VISITOR.email);
});

async function startConversation(chat: Page | FrameLocator, message: string) {
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await chat.getByLabel("Your name").fill(VISITOR.name);
  await chat.getByRole("textbox", { name: "Email" }).fill(VISITOR.email);
  await chat.getByLabel("Your message").pressSequentially(message, { delay: 10 });
  await chat.getByRole("button", { name: "Send message" }).click();
  await expect(chat.getByRole("log", { name: "Messages" })).toContainText(message);
}

/** The guest the visitor's conversations belong to, as the team sees it. */
async function contactsOfVisitor() {
  const { data } = await database
    .from("contacts")
    .select("id, kind, name, conversations(id)")
    .eq("email", VISITOR.email);
  return data ?? [];
}

/** The user id in the session this browser keeps, or null when it keeps none. */
async function storedUserId(page: Page): Promise<string | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw) as { user?: { id?: string } };
    return session.user?.id ?? null;
  }, SESSION_KEY);
}

/** Their conversation is on the home screen, and a new one does not ask who they are. */
async function expectWelcomedBack(chat: Page | FrameLocator, message: string) {
  await expect(chat.getByRole("region", { name: "Recent message" })).toContainText(message);
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await expect(chat.getByLabel("Your message")).toBeVisible();
  await expect(chat.getByLabel("Your name")).toHaveCount(0);
}

test("a session that cannot be checked on return is kept, not replaced", async ({ page }) => {
  await page.goto("/embed");
  await startConversation(page, "Where is my order?");
  const guest = await storedUserId(page);
  expect(guest).not.toBeNull();

  // Coming back to the tab on a phone, the network is not there yet for the first request.
  await page.route(
    "**/auth/v1/.well-known/jwks.json",
    (route) => route.abort("internetdisconnected"),
    {
      times: 1,
    },
  );
  await page.reload();

  await expectWelcomedBack(page, "Where is my order?");
  expect(await storedUserId(page)).toBe(guest);
  expect(await contactsOfVisitor()).toEqual([
    expect.objectContaining({ id: guest, conversations: [expect.anything()] }),
  ]);
});

for (const loss of ["cleared", "revoked"] as const) {
  test(`a guest whose session was ${loss} gets their conversation back`, async ({ page }) => {
    await page.goto("/embed");
    await startConversation(page, "Can I change the delivery address?");
    const guest = await storedUserId(page);

    if (loss === "cleared") {
      // The browser dropped the site's storage, as Safari does after days without a visit.
      await page.evaluate((key) => {
        window.localStorage.removeItem(key);
      }, SESSION_KEY);
    } else {
      // The refresh token is refused when it is next used, as when a frozen tab's refresh was
      // answered but the answer never arrived, and the old token was then used again.
      const token = await page.evaluate((key) => {
        const session = JSON.parse(window.localStorage.getItem(key) ?? "{}") as {
          access_token: string;
          expires_at: number;
        };
        // Due, so the next look at it refreshes it.
        session.expires_at = Math.floor(Date.now() / 1000) - 60;
        window.localStorage.setItem(key, JSON.stringify(session));
        return session.access_token;
      }, SESSION_KEY);
      await database.auth.admin.signOut(token, "global");
    }
    await page.reload();

    await expectWelcomedBack(page, "Can I change the delivery address?");
    // They are a new guest underneath, with the old one's conversation and details.
    const now = await storedUserId(page);
    expect(now).not.toBeNull();
    expect(now).not.toBe(guest);
    expect(await contactsOfVisitor()).toEqual([
      expect.objectContaining({ id: now, kind: "guest", name: VISITOR.name }),
    ]);
  });
}

test("the help center's chat and the chat page share one guest", async ({ page }) => {
  await page.goto("/help");
  // Pressed without aiming: on a phone-sized page the dev server's own badge sits over it.
  await page.getByRole("button", { name: "Open chat" }).dispatchEvent("click");
  const chat = page.frameLocator('iframe[title="Chat"]');
  await startConversation(chat, "Do you deliver on Sundays?");

  await page.goto("/chat");
  await expectWelcomedBack(page, "Do you deliver on Sundays?");
  expect(await contactsOfVisitor()).toHaveLength(1);
});

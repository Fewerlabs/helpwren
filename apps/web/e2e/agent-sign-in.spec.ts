import { expect, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

// Runs against the local Supabase stack and its demo data: `pnpm db:start`, then `pnpm db:env`.
// Emails the stack sends are caught by its test mailbox, Mailpit, which this reads the code from.
const MAILBOX = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const AGENT = { email: "sam@example.com", name: "Sam Rivera" };

const searchSchema = z.object({ messages: z.array(z.object({ Snippet: z.string() })) });

async function readSignInCode(request: APIRequestContext, email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const response = await request.get(`${MAILBOX}/api/v1/search`, {
        params: { query: `to:${email}`, limit: "1" },
      });
      const { messages } = searchSchema.parse(await response.json());
      code = /\b\d{6}\b/.exec(messages[0]?.Snippet ?? "")?.[0];
      return code;
    })
    .toBeDefined();
  return code ?? "";
}

test.beforeEach(async ({ request }) => {
  // Empty the mailbox, so the code found is the one this test asked for.
  await request.delete(`${MAILBOX}/api/v1/messages`);
});

test("a team member signs in with an emailed code and signs out", async ({ page, request }) => {
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/login$/);

  await page.getByLabel("Work email").fill(AGENT.email);
  await page.getByRole("button", { name: "Email me a code" }).click();

  const codeField = page.getByLabel("Sign-in code");
  await codeField.fill("000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That code is wrong or out of date.")).toBeVisible();

  await codeField.fill(await readSignInCode(request, AGENT.email));
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await expect(page.getByText(`Signed in as ${AGENT.name}`)).toBeVisible();

  await page.goto("/inbox/login");
  await expect(page, "someone signed in skips the sign-in page").toHaveURL(/\/inbox$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/inbox\/login$/);

  await page.goto("/inbox");
  await expect(page, "the inbox is closed again after signing out").toHaveURL(/\/inbox\/login$/);
});

test("an email that is not on the team gets the same answer and no code", async ({
  page,
  request,
}) => {
  await page.goto("/inbox/login");
  await page.getByLabel("Work email").fill("nobody@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();

  await expect(page.getByLabel("Sign-in code")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("If nobody@example.com is on the team");

  const response = await request.get(`${MAILBOX}/api/v1/messages`);
  expect(z.object({ total: z.number() }).parse(await response.json()).total).toBe(0);
});

import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";

// Emails the local stack sends are caught by its test mailbox, Mailpit.
const MAILBOX = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const searchSchema = z.object({ messages: z.array(z.object({ Snippet: z.string() })) });

export async function emptyMailbox(request: APIRequestContext) {
  await request.delete(`${MAILBOX}/api/v1/messages`);
}

export async function countEmails(request: APIRequestContext): Promise<number> {
  const response = await request.get(`${MAILBOX}/api/v1/messages`);
  return z.object({ total: z.number() }).parse(await response.json()).total;
}

/** Waits for the sign-in email to this address and returns the six-digit code in it. */
export async function readSignInCode(request: APIRequestContext, email: string): Promise<string> {
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

/** Signs a team member from the demo data in to the dashboard, through the sign-in page. */
export async function signInToInbox(page: Page, email: string) {
  await emptyMailbox(page.request);
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  // The last digit of the code sends the form; there is no button to press.
  await page.getByLabel("Sign-in code").fill(await readSignInCode(page.request, email));
  await expect(page).toHaveURL(/\/dashboard\/inbox$/);
}

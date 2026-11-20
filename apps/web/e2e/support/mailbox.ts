import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";

// Emails the local stack sends are caught by its test mailbox, Mailpit. Other test runs, and
// whoever is trying the app, use it at the same time, so nothing here empties it: each read
// looks only at emails to one address that arrived after the moment it was asked for.
const MAILBOX = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const searchSchema = z.object({
  messages: z.array(
    z.object({
      ID: z.string(),
      To: z.array(z.object({ Address: z.string() })),
      Snippet: z.string(),
    }),
  ),
});

/** Emails to exactly this address, newest first. */
async function emailsTo(request: APIRequestContext, email: string) {
  const response = await request.get(`${MAILBOX}/api/v1/search`, {
    params: { query: `to:"${email}"`, limit: "50" },
  });
  const { messages } = searchSchema.parse(await response.json());
  const address = email.toLowerCase();
  return messages.filter((message) =>
    message.To.some((to) => to.Address.toLowerCase() === address),
  );
}

/** A mark in the mailbox for one address: the emails it has had so far. */
export interface MailboxMark {
  email: string;
  seen: ReadonlySet<string>;
}

/** Notes what has already arrived for this address, so a later read finds only what is new. */
export async function markMailbox(request: APIRequestContext, email: string): Promise<MailboxMark> {
  return { email, seen: new Set((await emailsTo(request, email)).map((message) => message.ID)) };
}

/** How many emails have arrived for the address since the mark. */
export async function countNewEmails(request: APIRequestContext, mark: MailboxMark) {
  return (await emailsTo(request, mark.email)).filter((message) => !mark.seen.has(message.ID))
    .length;
}

/** Waits for a sign-in email to the address that arrived after the mark, and returns its code. */
export async function readSignInCode(
  request: APIRequestContext,
  mark: MailboxMark,
  timeout = 5000,
): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const fresh = (await emailsTo(request, mark.email)).find(
          (message) => !mark.seen.has(message.ID),
        );
        code = /\b\d{6}\b/.exec(fresh?.Snippet ?? "")?.[0];
        return code;
      },
      { message: `a sign-in code for ${mark.email}`, timeout },
    )
    .toBeDefined();
  return code ?? "";
}

/**
 * Signs a team member in to the dashboard, through the sign-in page. Others share the stack:
 * a code asked for less than a second after another one for the same person is not sent, and
 * a newer code makes an older one stale. Either way, a new code is asked for.
 */
export async function signInToInbox(page: Page, email: string) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const mark = await markMailbox(page.request, email);
    await page.goto("/login");
    await page.getByLabel("Work email").fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();
    // Only once the page asks for the code was this request taken; a code that arrives without
    // that was asked for by someone else.
    const codeField = page.getByLabel("Sign-in code");
    const asked = await codeField.waitFor({ timeout: 10_000 }).then(
      () => true,
      () => false,
    );
    if (!asked) continue;
    const code = await readSignInCode(page.request, mark).catch(() => undefined);
    if (code === undefined) continue;
    // The last digit of the code sends the form; there is no button to press.
    await codeField.fill(code);

    const outcome = await Promise.race([
      page.waitForURL(/\/dashboard\/inbox$/, { timeout: 15_000 }).then(
        () => "signed in" as const,
        () => "no answer" as const,
      ),
      page
        .getByText("That code is wrong or out of date.")
        .waitFor({ timeout: 15_000 })
        .then(
          () => "refused" as const,
          () => "no answer" as const,
        ),
    ]);
    if (outcome === "signed in") return;
  }
  throw new Error(`${email} could not sign in: no code that worked arrived.`);
}

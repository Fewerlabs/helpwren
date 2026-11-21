import "server-only";

import { parseSettings } from "@helpwren/core";

import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { chooseEmailAdapter, type EmailChoice } from "./choose";
import { type EmailAdapter, type EmailMessage, type SendResult } from "./types";

export { type EmailMessage, type SendResult } from "./types";

let choice: EmailChoice | undefined;

function chosen(): EmailChoice {
  choice ??= chooseEmailAdapter({
    provider: serverEnv.EMAIL_PROVIDER,
    smtpUrl: serverEnv.SMTP_URL,
    resendApiKey: serverEnv.RESEND_API_KEY,
  });
  return choice;
}

/**
 * The way this install sends mail, chosen by `EMAIL_PROVIDER`, or `null` when none is set up or
 * the one set up cannot be used. Made once: an SMTP connection is worth keeping.
 */
export function getEmailAdapter(): EmailAdapter | null {
  return chosen().adapter;
}

/** Why the provider set on the server cannot be used, or `null` when nothing is wrong. */
export function getEmailProblem(): string | null {
  return chosen().problem;
}

export type SendEmailResult =
  | SendResult
  /** No provider is set up, or the install has not said which address to send from. */
  | { ok: false; reason: "not_configured"; detail: string };

/**
 * Sends one email from the install: through its provider, from the address in its settings,
 * under its brand's name unless it chose another. Never throws for a mail problem; the result
 * says what happened, so a caller can carry on when mail is down.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const provider = getEmailAdapter();
  if (!provider) {
    return {
      ok: false,
      reason: "not_configured",
      detail: getEmailProblem() ?? "No email provider is set up.",
    };
  }

  const { data, error } = await supabaseAdmin.from("settings").select("key, value");
  if (error) throw error;
  const { brand, email } = parseSettings(data);
  if (!email.fromAddress) {
    return { ok: false, reason: "not_configured", detail: "No sending address is set." };
  }

  return provider.send(message, {
    name: email.fromName ?? brand.name,
    address: email.fromAddress,
  });
}

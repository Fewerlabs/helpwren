import "server-only";

import { parseSettings } from "@helpwren/core";

import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { chooseEmailAdapter, envChoosesEmail, type EmailChoice, type EmailEnv } from "./choose";
import { getSavedSmtp } from "./saved-smtp";
import { type EmailMessage, type SendResult } from "./types";

export { type EmailMessage, type SendResult } from "./types";

const env: EmailEnv = {
  provider: serverEnv.EMAIL_PROVIDER,
  smtpUrl: serverEnv.SMTP_URL,
  smtpHost: serverEnv.SMTP_HOST,
  smtpPort: serverEnv.SMTP_PORT,
  smtpUser: serverEnv.SMTP_USER,
  smtpPassword: serverEnv.SMTP_PASSWORD,
  resendApiKey: serverEnv.RESEND_API_KEY,
};

// An SMTP connection is worth keeping, so a choice is made again only when what it was made
// from changes: never for the environment, and when an admin saves a new server.
let kept: { key: string; choice: EmailChoice } | undefined;

/**
 * How this install sends mail: through the provider the server's environment sets, or else the
 * SMTP server saved in Settings → Email. `adapter` is `null` when neither is set up, or the
 * one set up cannot be used; `problem` then says why.
 */
export async function getEmail(): Promise<EmailChoice> {
  const saved = envChoosesEmail(env) ? null : await getSavedSmtp();
  const key = JSON.stringify(saved);
  if (kept?.key !== key) kept = { key, choice: chooseEmailAdapter(env, saved) };
  return kept.choice;
}

/** Whether the server's environment sets how mail is sent, so Settings → Email cannot. */
export const emailSetOnServer = envChoosesEmail(env);

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
  const { adapter: provider, problem } = await getEmail();
  if (!provider) {
    return {
      ok: false,
      reason: "not_configured",
      detail: problem ?? "No email provider is set up.",
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

import "server-only";

import { parseSettings } from "@helpwren/core";

import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { createResendAdapter } from "./resend";
import { createSmtpAdapter } from "./smtp";
import { type EmailAdapter, type EmailMessage, type SendResult } from "./types";

export { type EmailMessage, type SendResult } from "./types";

let adapter: EmailAdapter | null | undefined;

/**
 * The way this install sends mail, chosen by `EMAIL_PROVIDER`, or `null` when none is set up.
 * Made once: an SMTP connection is worth keeping.
 */
export function getEmailAdapter(): EmailAdapter | null {
  if (adapter === undefined) {
    adapter =
      serverEnv.EMAIL_PROVIDER === "smtp" && serverEnv.SMTP_URL
        ? createSmtpAdapter(serverEnv.SMTP_URL)
        : serverEnv.EMAIL_PROVIDER === "resend" && serverEnv.RESEND_API_KEY
          ? createResendAdapter(serverEnv.RESEND_API_KEY)
          : null;
  }
  return adapter;
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
    return { ok: false, reason: "not_configured", detail: "No email provider is set up." };
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

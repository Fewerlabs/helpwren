import "server-only";

import { createTurnstile, type CaptchaAdapter } from "@helpwren/adapters";
import { type Settings } from "@helpwren/core";

import { serverEnv } from "@/lib/server-env";

/**
 * The captcha the install asks for, or `null` when it asks for none. Switching it on takes
 * both halves: the site key in Settings, which the chat shows the widget with, and the secret
 * key in the server's environment, which the check needs. With only one, it stays off, so a
 * half-done setup never locks every visitor out.
 */
export function installCaptcha(settings: Settings): CaptchaAdapter | null {
  const secretKey = serverEnv.TURNSTILE_SECRET_KEY;
  if (settings.spam.captcha !== "turnstile" || !settings.spam.siteKey || !secretKey) return null;
  return createTurnstile({ secretKey });
}

/** Whether the server can check a captcha, for the settings page to say so. */
export const captchaSecretConfigured = () => Boolean(serverEnv.TURNSTILE_SECRET_KEY);

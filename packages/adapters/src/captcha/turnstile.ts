import { z } from "zod";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 10_000;

/** Checks the answer a browser got from a captcha. */
export interface CaptchaAdapter {
  /** Whether the token is a fresh, real answer. The visitor's network helps the check. */
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

export interface TurnstileOptions {
  /** The secret key Cloudflare gives with the site key. */
  secretKey: string;
  /** Replaces Cloudflare's address, for tests. */
  verifyUrl?: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
}

const answerSchema = z.object({ success: z.boolean() });

/**
 * Cloudflare Turnstile: free, and it asks most people nothing. Each token can be checked once,
 * so a bot cannot reuse one answer. When Cloudflare cannot be reached the check fails, which
 * refuses the visitor; an install that would rather let them through turns the captcha off.
 */
export function createTurnstile({
  secretKey,
  verifyUrl = VERIFY_URL,
  fetch: send = globalThis.fetch.bind(globalThis),
}: TurnstileOptions): CaptchaAdapter {
  return {
    async verify(token, remoteIp) {
      if (!token) return false;
      const form = new URLSearchParams({ secret: secretKey, response: token });
      if (remoteIp) form.set("remoteip", remoteIp);
      try {
        const response = await send(verifyUrl, {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) return false;
        const answer = answerSchema.safeParse(await response.json());
        return answer.success && answer.data.success;
      } catch {
        return false;
      }
    },
  };
}

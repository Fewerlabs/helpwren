import { z } from "zod";

import { type EmailAdapter } from "./types";

const ENDPOINT = "https://api.resend.com/emails";

/** What Resend sends back with a refusal. Only the message is used, and only if it is there. */
const refusalSchema = z.object({ message: z.string() });

/**
 * Sends through Resend's API, with nothing to run but an API key. `fetcher` is for tests.
 * See https://resend.com/docs/api-reference/emails/send-email
 */
export function createResendAdapter(apiKey: string, fetcher: typeof fetch = fetch): EmailAdapter {
  return {
    name: "Resend",
    async send(message, from) {
      let response: Response;
      try {
        response = await fetcher(ENDPOINT, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${from.name} <${from.address}>`,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            ...(message.html === undefined ? {} : { html: message.html }),
            ...(message.replyTo === undefined ? {} : { reply_to: message.replyTo }),
          }),
        });
      } catch (error) {
        return {
          ok: false,
          reason: "failed",
          detail: error instanceof Error ? error.message : "Resend could not be reached.",
        };
      }
      if (response.ok) return { ok: true };

      const refusal = refusalSchema.safeParse(await response.json().catch(() => null));
      return {
        ok: false,
        // A 5xx is Resend's trouble and worth trying again; anything else is about this email.
        reason: response.status >= 500 ? "failed" : "rejected",
        detail: refusal.success ? refusal.data.message : `Resend answered ${response.status}.`,
      };
    },
  };
}

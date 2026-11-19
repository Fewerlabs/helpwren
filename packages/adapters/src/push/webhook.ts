import { createHmac, timingSafeEqual } from "node:crypto";

/** The header that carries the signature: `t=<unix seconds>,v1=<hex HMAC-SHA256>`. */
export const WEBHOOK_SIGNATURE_HEADER = "helpwren-signature";
/** How old a signed request may be before it is taken for a replay. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;
const TIMEOUT_MS = 10_000;

/** What the product's backend is told: one for each conversation with replies to push. */
export interface PushEvent {
  /** `push.reply` for a reply; `push.test` for the test sent from Settings. */
  type: "push.reply" | "push.test";
  /** A new id for every event, for the receiver to ignore repeats by. */
  id: string;
  conversationId: string;
  contact: {
    /** Helpwren's id for the person. */
    id: string;
    /** The product's own id for its user, when they are one of its logged-in users. */
    externalId: string | null;
  };
  title: string;
  /** A short preview of the newest reply. */
  preview: string;
  /** Every reply the person has not read, across their conversations, for a badge. */
  unreadCount: number;
  /** When it was sent, as an ISO date. */
  sentAt: string;
}

/** The signature for a body sent at a time: an HMAC of the time, a dot, and the body. */
export function signWebhook(body: string, secret: string, timestamp: number): string {
  const digest = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${body}`)
    .digest("hex");
  return `t=${String(timestamp)},v1=${digest}`;
}

/**
 * Whether a request really came from this install: its signature matches the body and the
 * secret, and it was signed within the last five minutes, so a copied request cannot be sent
 * again later. What a receiver checks, written once here.
 */
export function verifyWebhook(
  body: string,
  header: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key = "", value = ""] = part.trim().split("=");
      return [key, value];
    }),
  );
  const timestamp = Number(parts.t);
  if (!Number.isInteger(timestamp) || !parts.v1) return false;
  if (Math.abs(now / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signWebhook(body, secret, timestamp).split("v1=")[1] ?? "", "hex");
  const given = Buffer.from(parts.v1, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface WebhookPushOptions {
  url: string;
  secret: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
}

export type WebhookResult = { ok: true } | { ok: false; detail: string };

export interface WebhookPush {
  send: (event: PushEvent) => Promise<WebhookResult>;
}

/**
 * Hands each push to the product's own backend, which sends it however it already does:
 * OneSignal, its own Firebase project, a text message. The request is signed, so the backend
 * can tell it came from this install.
 */
export function createWebhookPush(options: WebhookPushOptions): WebhookPush {
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);

  return {
    async send(event) {
      const body = JSON.stringify(event);
      let response: Response;
      try {
        response = await send(options.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "Helpwren-Webhook",
            [WEBHOOK_SIGNATURE_HEADER]: signWebhook(
              body,
              options.secret,
              Math.floor(Date.now() / 1000),
            ),
          },
          body,
          // Followed, a redirect could carry the event somewhere the admin did not choose.
          redirect: "error",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (cause) {
        return {
          ok: false,
          detail: `The address could not be reached: ${cause instanceof Error ? cause.message : ""}`,
        };
      }
      if (response.ok) return { ok: true };
      return { ok: false, detail: `The address answered with status ${String(response.status)}.` };
    },
  };
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  addressesOf,
  bareMessageId,
  InboundEmailError,
  messageIdList,
  parseMailbox,
  readJson,
  type InboundAttachment,
  type InboundEmailAdapter,
  type InboundRequest,
} from "./types";

const API = "https://api.resend.com";
const TIMEOUT_MS = 10_000;
/** How old a signed request may be, as Svix's own libraries allow. */
export const SVIX_TOLERANCE_SECONDS = 300;

export interface ResendInboundOptions {
  /** The webhook's signing secret from Resend's dashboard, `whsec_…`. */
  signingSecret: string;
  /** An API key that may read received emails: the webhook carries only their metadata. */
  apiKey: string;
  /** Replaces Resend's address, for tests. */
  apiUrl?: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
  /** Replaces the clock, for tests. */
  now?: () => number;
}

/**
 * Whether a request was signed by Svix, which sends Resend's webhooks: an HMAC-SHA256 of
 * `<id>.<timestamp>.<body>` under the base64 part of the secret, one of several space-separated
 * `v1,<base64>` signatures, signed within five minutes.
 * See https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
export function verifySvix(
  request: InboundRequest,
  secret: string,
  now: number = Date.now(),
): boolean {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds) || Math.abs(now / 1000 - seconds) > SVIX_TOLERANCE_SECONDS) {
    return false;
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${request.body}`).digest();
  return signatures.split(" ").some((entry) => {
    const [version, signature = ""] = entry.split(",");
    if (version !== "v1") return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** The `email.received` event: only metadata. https://resend.com/docs/dashboard/receiving/create-receiving-webhook */
const eventSchema = z.object({
  type: z.literal("email.received"),
  data: z.object({
    email_id: z.string().min(1),
    from: z.string(),
    to: z.array(z.string()).default([]),
    cc: z.array(z.string()).default([]),
    bcc: z.array(z.string()).default([]),
    received_for: z.array(z.string()).default([]),
    message_id: z.string().nullish(),
    subject: z.string().nullish(),
  }),
});

/** A received email. https://resend.com/docs/api-reference/emails/retrieve-received-email */
const emailSchema = z.object({
  html: z.string().nullish(),
  text: z.string().nullish(),
  headers: z.record(z.string(), z.unknown()).nullish(),
  message_id: z.string().nullish(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string().nullish(),
        content_type: z.string().nullish(),
        content_disposition: z.string().nullish(),
        size: z.number().nullish(),
      }),
    )
    .default([]),
});

/** https://resend.com/docs/api-reference/emails/list-received-email-attachments */
const attachmentListSchema = z.object({
  data: z.array(z.object({ id: z.string(), download_url: z.url() })),
});

/** A header Resend gives as a string, or the first of several. */
function header(headers: Record<string, unknown> | null | undefined, name: string): string | null {
  const value = headers?.[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/**
 * Mail received through Resend: a domain whose MX record points at Resend, and a webhook for
 * `email.received`. The webhook says an email arrived; its words and files are read through the
 * API with a key. https://resend.com/docs/dashboard/receiving/introduction
 */
export function createResendInbound(options: ResendInboundOptions): InboundEmailAdapter {
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);
  const api = options.apiUrl ?? API;

  async function get(path: string): Promise<unknown> {
    const response = await send(`${api}${path}`, {
      headers: { authorization: `Bearer ${options.apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new InboundEmailError(`Resend answered ${String(response.status)} for ${path}.`);
    }
    return response.json();
  }

  return {
    provider: "resend",
    verify: (request) => verifySvix(request, options.signingSecret, options.now?.()),
    async parse(request) {
      const event = eventSchema.safeParse(readJson(request.body));
      if (!event.success) throw new InboundEmailError("Not an email.received event.");
      const { data } = event;
      const emailId = data.data.email_id;
      const email = emailSchema.parse(await get(`/emails/receiving/${emailId}`));

      // Download links last an hour, so they are asked for only when the files are wanted.
      let links: Promise<Map<string, string>> | null = null;
      const linkFor = async (id: string) => {
        links ??= get(`/emails/receiving/${emailId}/attachments`).then(
          (list) =>
            new Map(
              attachmentListSchema.parse(list).data.map((item) => [item.id, item.download_url]),
            ),
        );
        const url = (await links).get(id);
        if (!url) throw new InboundEmailError("Resend gave no link for an attachment.");
        return url;
      };

      const attachments: InboundAttachment[] = email.attachments.map((item) => ({
        name: item.filename ?? "file",
        type: item.content_type ?? "application/octet-stream",
        size: item.size ?? null,
        inline: item.content_disposition === "inline",
        async content() {
          const response = await send(await linkFor(item.id), {
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
          if (!response.ok) throw new InboundEmailError("An attachment could not be downloaded.");
          return new Uint8Array(await response.arrayBuffer());
        },
      }));

      return {
        from: parseMailbox(data.data.from),
        recipients: addressesOf([
          ...data.data.to,
          ...data.data.cc,
          ...data.data.bcc,
          ...data.data.received_for,
          header(email.headers, "delivered-to"),
        ]),
        subject: data.data.subject ?? "",
        text: email.text ?? null,
        html: email.html ?? null,
        messageId: bareMessageId(email.message_id ?? data.data.message_id),
        providerId: emailId,
        inReplyTo: bareMessageId(header(email.headers, "in-reply-to")),
        references: messageIdList(header(email.headers, "references")),
        attachments,
      };
    },
  };
}

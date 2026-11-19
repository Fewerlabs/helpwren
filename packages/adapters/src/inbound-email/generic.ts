import { z } from "zod";

import { verifyWebhook, WEBHOOK_SIGNATURE_HEADER } from "../push/webhook";
import {
  addressesOf,
  bareMessageId,
  InboundEmailError,
  parseMailbox,
  readJson,
  type InboundEmail,
  type InboundEmailAdapter,
  type InboundRequest,
} from "./types";

export interface GenericInboundOptions {
  /** The secret the sender signs with, made in Settings > Email. */
  secret: string;
  /** Replaces the clock, for tests. */
  now?: () => number;
}

/**
 * What any provider or mail-to-webhook bridge posts: the email, already parsed, with files
 * inline as base64. Signed like Helpwren's own webhooks, `helpwren-signature: t=<seconds>,v1=<hex
 * HMAC-SHA256 of "<t>.<body>">`, and turned away when older than five minutes.
 */
export const genericInboundSchema = z.object({
  from: z.string().min(3),
  to: z.array(z.string()).min(1),
  cc: z.array(z.string()).default([]),
  /** Addresses the email was delivered to that are not in To or Cc, such as a Delivered-To. */
  deliveredTo: z.array(z.string()).default([]),
  subject: z.string().default(""),
  text: z.string().nullish(),
  html: z.string().nullish(),
  messageId: z.string().nullish(),
  inReplyTo: z.string().nullish(),
  references: z.array(z.string()).default([]),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        /** The file's bytes, base64. */
        content: z.base64(),
        inline: z.boolean().default(false),
      }),
    )
    .default([]),
});

export type GenericInboundEmail = z.input<typeof genericInboundSchema>;

export function createGenericInbound(options: GenericInboundOptions): InboundEmailAdapter {
  return {
    provider: "generic",
    verify: (request) =>
      verifyWebhook(
        request.body,
        request.headers.get(WEBHOOK_SIGNATURE_HEADER) ?? "",
        options.secret,
        options.now?.(),
      ),
    // Through `then`, so a body that cannot be read becomes a rejection like any other.
    parse: (request) => Promise.resolve(request).then(read),
  };
}

function read(request: InboundRequest): InboundEmail {
  const payload = genericInboundSchema.safeParse(readJson(request.body));
  if (!payload.success) {
    throw new InboundEmailError(`Not an email: ${z.prettifyError(payload.error)}`);
  }
  const email = payload.data;
  return {
    from: parseMailbox(email.from),
    recipients: addressesOf([...email.to, ...email.cc, ...email.deliveredTo]),
    subject: email.subject,
    text: email.text ?? null,
    html: email.html ?? null,
    messageId: bareMessageId(email.messageId),
    providerId: null,
    inReplyTo: bareMessageId(email.inReplyTo),
    references: email.references.flatMap((id) => bareMessageId(id) ?? []),
    attachments: email.attachments.map((item) => {
      const bytes = Buffer.from(item.content, "base64");
      return {
        name: item.name,
        type: item.type,
        size: bytes.byteLength,
        inline: item.inline,
        content: () => Promise.resolve(new Uint8Array(bytes)),
      };
    }),
  };
}

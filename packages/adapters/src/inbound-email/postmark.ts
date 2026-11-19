import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  addressesOf,
  bareMessageId,
  InboundEmailError,
  messageIdList,
  readJson,
  type InboundEmail,
  type InboundEmailAdapter,
  type InboundRequest,
} from "./types";

export interface PostmarkInboundOptions {
  /**
   * The password in the webhook's address, `https://postmark:<secret>@…`. Postmark does not
   * sign its webhooks; it recommends basic auth over HTTPS instead.
   */
  secret: string;
}

/** The user name in the webhook's address. Any name is accepted; the password is the proof. */
export const POSTMARK_USER = "postmark";

/** Whether the request's basic auth carries the secret as its password. */
export function verifyBasicAuth(request: InboundRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Basic\s+(\S+)$/i.exec(header);
  if (!match?.[1]) return false;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const given = Buffer.from(decoded.slice(decoded.indexOf(":") + 1));
  const expected = Buffer.from(secret);
  return (
    decoded.includes(":") && given.length === expected.length && timingSafeEqual(given, expected)
  );
}

const mailboxSchema = z.object({ Email: z.string(), Name: z.string().nullish() });

/** Postmark's inbound JSON. https://postmarkapp.com/developer/webhooks/inbound-webhook */
const payloadSchema = z.object({
  FromFull: mailboxSchema,
  ToFull: z.array(mailboxSchema).default([]),
  CcFull: z.array(mailboxSchema).default([]),
  BccFull: z.array(mailboxSchema).default([]),
  OriginalRecipient: z.string().nullish(),
  Subject: z.string().nullish(),
  MessageID: z.string().nullish(),
  TextBody: z.string().nullish(),
  HtmlBody: z.string().nullish(),
  Headers: z.array(z.object({ Name: z.string(), Value: z.string() })).default([]),
  Attachments: z
    .array(
      z.object({
        Name: z.string().nullish(),
        Content: z.string(),
        ContentType: z.string().nullish(),
        ContentLength: z.number().nullish(),
        ContentID: z.string().nullish(),
      }),
    )
    .default([]),
});

/**
 * Mail received through Postmark's inbound stream: its inbound address, or a domain whose MX
 * record points at `inbound.postmarkapp.com`. Postmark posts the whole email, files included,
 * as JSON.
 */
export function createPostmarkInbound(options: PostmarkInboundOptions): InboundEmailAdapter {
  return {
    provider: "postmark",
    verify: (request) => verifyBasicAuth(request, options.secret),
    // Through `then`, so a body that cannot be read becomes a rejection like any other.
    parse: (request) => Promise.resolve(request).then(read),
  };
}

function read(request: InboundRequest): InboundEmail {
  const payload = payloadSchema.safeParse(readJson(request.body));
  if (!payload.success) throw new InboundEmailError("Not a Postmark inbound email.");
  const email = payload.data;
  const header = (name: string) =>
    email.Headers.find((item) => item.Name.toLowerCase() === name)?.Value ?? null;
  const name = email.FromFull.Name?.trim() ?? "";

  return {
    from: { address: email.FromFull.Email.trim().toLowerCase(), name: name === "" ? null : name },
    recipients: addressesOf([
      ...[...email.ToFull, ...email.CcFull, ...email.BccFull].map((mailbox) => mailbox.Email),
      email.OriginalRecipient,
      header("delivered-to"),
    ]),
    subject: email.Subject ?? "",
    text: email.TextBody ?? null,
    html: email.HtmlBody ?? null,
    // Postmark's MessageID is its own; the sender's is among the headers.
    messageId: bareMessageId(header("message-id")),
    providerId: email.MessageID ?? null,
    inReplyTo: bareMessageId(header("in-reply-to")),
    references: messageIdList(header("references")),
    attachments: email.Attachments.map((item) => {
      const bytes = Buffer.from(item.Content, "base64");
      return {
        name: item.Name ?? "file",
        type: item.ContentType ?? "application/octet-stream",
        size: bytes.byteLength,
        // An inline image has a content id the HTML points at. Some mail apps give attached
        // files one too, so the HTML is checked.
        inline:
          Boolean(item.ContentID) && (email.HtmlBody ?? "").includes(`cid:${item.ContentID ?? ""}`),
        content: () => Promise.resolve(new Uint8Array(bytes)),
      };
    }),
  };
}

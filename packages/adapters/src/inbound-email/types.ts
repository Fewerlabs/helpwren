/** The providers this install can receive mail from. IMAP polling is planned, not built. */
export type InboundProvider = "resend" | "postmark" | "generic";

/** A webhook request as it arrived: the body untouched, because signatures cover its bytes. */
export interface InboundRequest {
  body: string;
  headers: Headers;
}

/** A file that came with an email. Its bytes are fetched only when they are wanted. */
export interface InboundAttachment {
  name: string;
  /** The MIME type the sender's mail app gave. Checked again when the file is stored. */
  type: string;
  /** In bytes, when the provider says; `null` when it is only known once fetched. */
  size: number | null;
  /** Inline images (a signature's logo) are part of the layout, not something sent. */
  inline: boolean;
  content: () => Promise<Uint8Array>;
}

/** One email received, the same whichever provider passed it on. */
export interface InboundEmail {
  from: { address: string; name: string | null };
  /** Every address the email was for: To, Cc, and the addresses the provider delivered to. */
  recipients: string[];
  subject: string;
  text: string | null;
  html: string | null;
  /** The Message-ID header, without its angle brackets. */
  messageId: string | null;
  /** The provider's own id for the email, for when it had no Message-ID. */
  providerId: string | null;
  inReplyTo: string | null;
  references: string[];
  attachments: InboundAttachment[];
}

/**
 * One way mail reaches the install. A webhook adapter checks a request really came from its
 * provider and turns it into an `InboundEmail`. IMAP polling, the fallback for any mailbox,
 * will be a second kind of source that yields the same `InboundEmail`.
 */
export interface InboundEmailAdapter {
  provider: InboundProvider;
  /** Whether the request carries the provider's proof. Never throws. */
  verify: (request: InboundRequest) => boolean;
  /** Reads a verified request. Throws `InboundEmailError` for a body it cannot read. */
  parse: (request: InboundRequest) => Promise<InboundEmail>;
}

/** A request that passed verification but could not be read as an email. */
export class InboundEmailError extends Error {
  override name = "InboundEmailError";
}

/** `<id@host>` or `id@host` to `id@host`. */
export function bareMessageId(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/^<|>$/g, "") ?? "";
  return trimmed === "" ? null : trimmed;
}

/** A References header to its ids, oldest first. */
export function messageIdList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\s+/)
    .map(bareMessageId)
    .filter((id): id is string => id !== null);
}

/** `Ada Lovelace <Ada@Example.com>` or `ada@example.com` to its parts, address lowercased. */
export function parseMailbox(value: string): { address: string; name: string | null } {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  if (match) {
    const name = match[1]?.trim() ?? "";
    return { address: (match[2] ?? "").trim().toLowerCase(), name: name === "" ? null : name };
  }
  return { address: value.trim().toLowerCase(), name: null };
}

/** A body as JSON, or an `InboundEmailError` saying it is not. */
export function readJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new InboundEmailError("The body is not JSON.");
  }
}

/** A list of mailboxes, as in a To header or an array of them, to lowercased addresses. */
export function addressesOf(values: readonly (string | null | undefined)[]): string[] {
  return values
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => parseMailbox(value).address)
    .filter((address) => address.includes("@"));
}

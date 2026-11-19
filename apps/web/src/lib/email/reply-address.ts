import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed reply addresses: `reply+<token>@support.example.com`, where the token names a
 * conversation and proves this install made it for that conversation's contact. Without the key
 * nobody can make one, so the address cannot be used to write into someone else's conversation.
 *
 * The token is 27 bytes, written in lowercase base32 (44 characters, well inside the 64 an
 * address's local part may have, and safe from mail servers that change case):
 *
 *   1 byte    the key's version, so a key can be replaced while older emails still work
 *   16 bytes  the conversation's id
 *   10 bytes  HMAC-SHA256 of the version, the conversation and its contact, cut to 80 bits:
 *             far more than anyone can guess by sending mail
 */

/** A key that signs reply addresses. `secret` is base64url. */
export interface ReplyKey {
  version: number;
  secret: string;
}

const MAC_BYTES = 10;
const TOKEN_BYTES = 1 + 16 + MAC_BYTES;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET.charAt((value << (5 - bits)) & 31);
  return out;
}

function fromBase32(text: string): Uint8Array | null {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of text.toLowerCase()) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return null;
    value = ((value << 5) | index) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

const uuidBytes = (id: string) => Buffer.from(id.replaceAll("-", ""), "hex");

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mac(key: ReplyKey, conversationId: string, contactId: string): Buffer {
  return createHmac("sha256", Buffer.from(key.secret, "base64url"))
    .update(`helpwren-reply:${String(key.version)}:${conversationId}:${contactId}`)
    .digest()
    .subarray(0, MAC_BYTES);
}

/** The token for a conversation and its contact, signed with the newest key. */
export function signReplyToken(key: ReplyKey, conversationId: string, contactId: string): string {
  const bytes = Buffer.concat([
    Buffer.from([key.version]),
    uuidBytes(conversationId),
    mac(key, conversationId, contactId),
  ]);
  return toBase32(bytes);
}

/** What a token says, before it is checked. `null` for something that is not a token at all. */
export interface ReadToken {
  version: number;
  conversationId: string;
  mac: Uint8Array;
}

export function readReplyToken(token: string): ReadToken | null {
  const bytes = fromBase32(token);
  if (bytes?.length !== TOKEN_BYTES) return null;
  return {
    version: bytes[0] ?? 0,
    conversationId: bytesToUuid(bytes.subarray(1, 17)),
    mac: bytes.subarray(17),
  };
}

/**
 * Whether a read token was signed by one of the keys for this contact. Compared in constant
 * time, so the signature cannot be found a byte at a time.
 */
export function checkReplyToken(
  token: ReadToken,
  contactId: string,
  keys: readonly ReplyKey[],
): boolean {
  const key = keys.find((candidate) => candidate.version === token.version);
  if (!key) return false;
  const expected = mac(key, token.conversationId, contactId);
  return expected.length === token.mac.length && timingSafeEqual(expected, token.mac);
}

/** `reply@support.example.com` and a token to `reply+<token>@support.example.com`. */
export function replyAddress(base: string, token: string): string {
  const at = base.lastIndexOf("@");
  return `${base.slice(0, at)}+${token}@${base.slice(at + 1)}`;
}

/**
 * The token in the first recipient that is the reply address with a plus part, or `null`. The
 * domain and the part before the plus must match the reply address, ignoring case.
 */
export function findReplyToken(recipients: readonly string[], base: string): string | null {
  const at = base.lastIndexOf("@");
  const local = base.slice(0, at).toLowerCase();
  const domain = base.slice(at + 1).toLowerCase();
  for (const recipient of recipients) {
    const split = recipient.lastIndexOf("@");
    if (recipient.slice(split + 1).toLowerCase() !== domain) continue;
    const mailbox = recipient.slice(0, split).toLowerCase();
    if (mailbox.startsWith(`${local}+`)) return mailbox.slice(local.length + 1);
  }
  return null;
}

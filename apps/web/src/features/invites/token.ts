import { createHash, randomBytes } from "node:crypto";

/** How long an invite link works. The database gives each invite the same lifetime. */
export const INVITE_LIFETIME_DAYS = 7;

/** 32 random bytes, in base64url: what goes in the link. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Whether text has the shape of an invite token, before anything is looked up. */
export function isInviteToken(text: string): boolean {
  return TOKEN_PATTERN.test(text);
}

/** The SHA-256 of a token, in hex: all the database keeps of it. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new token for an invite link, and the hash to store. The token itself is never stored. */
export function createInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

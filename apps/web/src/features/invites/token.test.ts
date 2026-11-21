import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createInviteToken, hashInviteToken, isInviteToken } from "./token";

describe("invite tokens", () => {
  it("are 32 random bytes in base64url, different every time", () => {
    const tokens = Array.from({ length: 50 }, () => createInviteToken().token);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("are kept only as their SHA-256, in hex", () => {
    const { token, hash } = createInviteToken();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hash).not.toContain(token);
    expect(hashInviteToken(token)).toBe(hash);
  });

  it("are told apart from anything else in a link before a lookup", () => {
    expect(isInviteToken(createInviteToken().token)).toBe(true);
    expect(isInviteToken("")).toBe(false);
    expect(isInviteToken("not-a-token")).toBe(false);
    expect(isInviteToken(`${"a".repeat(43)}/`)).toBe(false);
    expect(isInviteToken("a".repeat(44))).toBe(false);
  });
});

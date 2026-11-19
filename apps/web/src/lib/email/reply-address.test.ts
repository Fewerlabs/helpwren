import { describe, expect, it } from "vitest";

import {
  checkReplyToken,
  findReplyToken,
  readReplyToken,
  replyAddress,
  signReplyToken,
  type ReplyKey,
} from "./reply-address";

const key: ReplyKey = { version: 1, secret: Buffer.from("k".repeat(32)).toString("base64url") };
const next: ReplyKey = { version: 2, secret: Buffer.from("n".repeat(32)).toString("base64url") };
const CONVERSATION = "5b6c1a2e-9d3f-4e1a-8b7c-0123456789ab";
const CONTACT = "0f1e2d3c-4b5a-4968-8776-655443322110";
const SOMEONE_ELSE = "11111111-2222-4333-8444-555555555555";

describe("signed reply tokens", () => {
  it("round-trips: the token names the conversation and checks out for its contact", () => {
    const token = signReplyToken(key, CONVERSATION, CONTACT);
    expect(token).toMatch(/^[a-z2-7]{44}$/);
    expect(replyAddress("reply@support.acme.example", token).split("@")[0]?.length).toBeLessThan(
      64,
    );

    const read = readReplyToken(token);
    expect(read).toMatchObject({ version: 1, conversationId: CONVERSATION });
    expect(read && checkReplyToken(read, CONTACT, [key])).toBe(true);
    // Mail servers may change the case of an address.
    const upper = readReplyToken(token.toUpperCase());
    expect(upper && checkReplyToken(upper, CONTACT, [key])).toBe(true);
  });

  it("turns away a token for another contact, another key, or one changed by a character", () => {
    const token = signReplyToken(key, CONVERSATION, CONTACT);
    const read = readReplyToken(token);
    if (!read) throw new Error("unreadable");
    expect(checkReplyToken(read, SOMEONE_ELSE, [key])).toBe(false);
    expect(checkReplyToken(read, CONTACT, [next])).toBe(false);
    expect(checkReplyToken(read, CONTACT, [])).toBe(false);

    // Pointing a token at another conversation breaks its signature.
    for (const index of [0, 5, 20, 40]) {
      const char = token[index] === "a" ? "b" : "a";
      const tampered = readReplyToken(`${token.slice(0, index)}${char}${token.slice(index + 1)}`);
      expect(tampered !== null && checkReplyToken(tampered, CONTACT, [key])).toBe(false);
    }
  });

  it("keeps working for older emails when a newer key is added", () => {
    const old = readReplyToken(signReplyToken(key, CONVERSATION, CONTACT));
    const fresh = readReplyToken(signReplyToken(next, CONVERSATION, CONTACT));
    expect(old && checkReplyToken(old, CONTACT, [next, key])).toBe(true);
    expect(fresh && checkReplyToken(fresh, CONTACT, [next, key])).toBe(true);
  });

  it("reads nothing from text that is not a token", () => {
    expect(readReplyToken("")).toBeNull();
    expect(readReplyToken("not-a-token!")).toBeNull();
    expect(readReplyToken("abc")).toBeNull();
    expect(readReplyToken("a".repeat(60))).toBeNull();
  });
});

describe("findReplyToken", () => {
  const base = "reply@support.acme.example";

  it("finds the plus part of the reply address among the recipients, ignoring case", () => {
    expect(findReplyToken(["team@acme.example", "Reply+TOKEN123@Support.Acme.Example"], base)).toBe(
      "token123",
    );
  });

  it("ignores the bare address, other mailboxes and other domains", () => {
    expect(findReplyToken(["reply@support.acme.example"], base)).toBeNull();
    expect(findReplyToken(["replyx+token@support.acme.example"], base)).toBeNull();
    expect(findReplyToken(["reply+token@evil.example"], base)).toBeNull();
    expect(findReplyToken([], base)).toBeNull();
  });
});

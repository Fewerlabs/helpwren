import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { generateTemporaryPassword, PASSWORD_WORDS } from "./temporary-password";

const SHAPE = /^([a-z]+)-([a-z]+)-([a-z]+)-([a-z]+)-(\d{2})$/;

describe("generateTemporaryPassword", () => {
  it("picks from 256 distinct, plain words, so each word is one random byte", () => {
    expect(PASSWORD_WORDS).toHaveLength(256);
    expect(new Set(PASSWORD_WORDS).size).toBe(256);
    for (const word of PASSWORD_WORDS) expect(word).toMatch(/^[a-z]{3,9}$/);
  });

  it("is four of those words and two digits, joined by hyphens", () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generateTemporaryPassword();
      const match = SHAPE.exec(password);
      expect(match, password).not.toBeNull();
      for (const word of match?.slice(1, 5) ?? []) expect(PASSWORD_WORDS).toContain(word);
      expect(password.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
      expect(password.length).toBeLessThanOrEqual(PASSWORD_MAX_LENGTH);
    }
  });

  it("is different every time, and uses the whole list", () => {
    const passwords = Array.from({ length: 2000 }, generateTemporaryPassword);
    expect(new Set(passwords).size).toBe(passwords.length);
    const words = new Set(passwords.flatMap((password) => password.split("-").slice(0, 4)));
    // 8000 picks from 256 words leave almost none out; a broken picker would leave many.
    expect(words.size).toBeGreaterThan(240);
    const digits = new Set(passwords.map((password) => password.slice(-2)));
    expect(digits.size).toBeGreaterThan(90);
  });
});

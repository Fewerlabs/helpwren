import { describe, expect, it } from "vitest";

import { createRateLimit } from "./rate-limit";

describe("createRateLimit", () => {
  it("lets a key through up to the limit in each window", () => {
    const allow = createRateLimit({ limit: 2, windowMs: 1000 });
    expect([allow("a", 0), allow("a", 10), allow("a", 20)]).toEqual([true, true, false]);
    expect(allow("b", 20)).toBe(true);
    expect(allow("a", 1000)).toBe(true);
  });

  it("forgets the oldest key when it holds too many", () => {
    const allow = createRateLimit({ limit: 1, windowMs: 1000, maxKeys: 2 });
    allow("a", 0);
    allow("b", 0);
    allow("c", 0);
    // "a" was forgotten, so it starts a fresh window; "c" is still counted.
    expect(allow("a", 1)).toBe(true);
    expect(allow("c", 1)).toBe(false);
  });
});

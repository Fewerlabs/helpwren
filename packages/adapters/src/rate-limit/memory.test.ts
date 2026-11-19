import { describe, expect, it } from "vitest";

import { createMemoryRateLimit } from "./memory";

const rule = { limit: 2, windowSeconds: 1 };

describe("createMemoryRateLimit", () => {
  it("lets a key through up to the limit in each window", async () => {
    let time = 0;
    const store = createMemoryRateLimit({ now: () => time });
    const hits = [
      await store.hit("a", rule),
      await store.hit("a", rule),
      await store.hit("a", rule),
    ];
    expect(hits).toEqual([true, true, false]);
    expect(await store.hit("b", rule)).toBe(true);
    time = 1000;
    expect(await store.hit("a", rule)).toBe(true);
  });

  it("forgets the oldest key when it holds too many", async () => {
    const store = createMemoryRateLimit({ maxKeys: 2, now: () => 0 });
    const one = { limit: 1, windowSeconds: 1 };
    await store.hit("a", one);
    await store.hit("b", one);
    await store.hit("c", one);
    // "a" was forgotten, so it starts a fresh window; "c" is still counted.
    expect(await store.hit("a", one)).toBe(true);
    expect(await store.hit("c", one)).toBe(false);
  });
});

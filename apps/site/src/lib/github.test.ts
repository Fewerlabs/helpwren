import { afterEach, describe, expect, it, vi } from "vitest";

import { formatCount, getStarCount } from "./github";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formatCount", () => {
  it("writes small counts in full and thousands with one decimal", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(950)).toBe("950");
    expect(formatCount(1234)).toBe("1.2k");
    expect(formatCount(12_000)).toBe("12k");
  });
});

describe("getStarCount", () => {
  it("reads the count from GitHub's answer", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ stargazers_count: 42 })));
    await expect(getStarCount()).resolves.toBe(42);
  });

  it("leaves the count out when GitHub refuses or cannot be reached", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("rate limited", { status: 403 })));
    await expect(getStarCount()).resolves.toBeNull();
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
    await expect(getStarCount()).resolves.toBeNull();
  });

  it("leaves the count out when the answer has an unexpected shape", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ stars: "many" })));
    await expect(getStarCount()).resolves.toBeNull();
  });
});

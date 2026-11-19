import { describe, expect, it } from "vitest";

import { frameAncestorSources } from "./frame-ancestors";

describe("frameAncestorSources", () => {
  it("sets no limit until domains are configured", () => {
    expect(frameAncestorSources([])).toBe("any");
  });

  it("allows the listed sites over HTTPS", () => {
    expect(frameAncestorSources(["example.com", " App.Example.com ", "*.example.org"])).toEqual([
      "https://example.com",
      "https://app.example.com",
      "https://*.example.org",
    ]);
  });

  it("allows a local address over HTTP, for development", () => {
    expect(frameAncestorSources(["localhost:4100", "127.0.0.1"])).toEqual([
      "http://localhost:4100",
      "http://127.0.0.1",
    ]);
  });

  it("skips entries that are not hosts, without opening the chat to everyone", () => {
    expect(
      frameAncestorSources(["https://example.com/page", "*", "a b", "'none'; script-src *"]),
    ).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { frameAncestorsPolicy } from "./frame-ancestors";

describe("frameAncestorsPolicy", () => {
  it("sets no limit until domains are configured", () => {
    expect(frameAncestorsPolicy([])).toBeNull();
  });

  it("allows the listed sites over HTTPS, and the app itself", () => {
    expect(frameAncestorsPolicy(["example.com", " App.Example.com ", "*.example.org"])).toBe(
      "frame-ancestors 'self' https://example.com https://app.example.com https://*.example.org",
    );
  });

  it("allows a local address over HTTP, for development", () => {
    expect(frameAncestorsPolicy(["localhost:4100", "127.0.0.1"])).toBe(
      "frame-ancestors 'self' http://localhost:4100 http://127.0.0.1",
    );
  });

  it("skips entries that are not hosts, without opening the chat to everyone", () => {
    expect(
      frameAncestorsPolicy(["https://example.com/page", "*", "a b", "'none'; script-src *"]),
    ).toBe("frame-ancestors 'self'");
  });
});

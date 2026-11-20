import { describe, expect, it } from "vitest";

import { originAllowed } from "./allowed-origin";

const APP = "https://support.example.com";

describe("originAllowed", () => {
  it("lets any site read while no domains are set", () => {
    expect(originAllowed("https://anywhere.io", [], APP)).toBe(true);
  });

  it("always lets the install itself read", () => {
    expect(originAllowed(APP, ["example.org"], APP)).toBe(true);
  });

  it("lets the listed sites read over HTTPS, and no one else", () => {
    const domains = ["example.org", "*.shop.io"];
    expect(originAllowed("https://example.org", domains, APP)).toBe(true);
    expect(originAllowed("http://example.org", domains, APP)).toBe(false);
    expect(originAllowed("https://www.example.org", domains, APP)).toBe(false);
    expect(originAllowed("https://evil.io", domains, APP)).toBe(false);
    expect(originAllowed("https://eu.shop.io", domains, APP)).toBe(true);
    expect(originAllowed("https://shop.io", domains, APP)).toBe(false);
    expect(originAllowed("https://notshop.io", domains, APP)).toBe(false);
  });

  it("compares ports, and allows a local address over HTTP", () => {
    const domains = ["www.glown.localhost:4300", "localhost:4100"];
    expect(originAllowed("http://www.glown.localhost:4300", domains, APP)).toBe(true);
    expect(originAllowed("http://www.glown.localhost:4301", domains, APP)).toBe(false);
    expect(originAllowed("http://localhost:4100", domains, APP)).toBe(true);
    expect(originAllowed("http://127.0.0.1:4300", domains, APP)).toBe(false);
  });

  it("refuses an origin that is not an address", () => {
    expect(originAllowed("null", ["example.org"], APP)).toBe(false);
  });
});

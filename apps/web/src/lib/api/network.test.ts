import { describe, expect, it } from "vitest";

import { clientAddress, networkKey } from "./network";

const headers = (value: string) => new Headers({ "x-forwarded-for": value });

describe("clientAddress", () => {
  it("takes the address the nearest proxy saw, not the ones the browser sent", () => {
    expect(clientAddress(headers("1.1.1.1, 203.0.113.9"), "x-forwarded-for")).toBe("203.0.113.9");
  });

  it("is null without a usable address", () => {
    expect(clientAddress(new Headers(), "x-forwarded-for")).toBeNull();
    expect(clientAddress(headers("not-an-address"), "x-forwarded-for")).toBeNull();
  });

  it("does not count this machine as a network, as every request in development comes from it", () => {
    expect(clientAddress(headers("127.0.0.1"), "x-forwarded-for")).toBeNull();
    expect(clientAddress(headers("::1"), "x-forwarded-for")).toBeNull();
    expect(clientAddress(headers("::ffff:127.0.0.1"), "x-forwarded-for")).toBeNull();
  });
});

describe("networkKey", () => {
  it("is a keyed hash, the same for the same network and secret", () => {
    const key = networkKey("203.0.113.9", "secret");
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(networkKey("203.0.113.9", "secret")).toBe(key);
    expect(networkKey("203.0.113.9", "other")).not.toBe(key);
    expect(networkKey("203.0.113.10", "secret")).not.toBe(key);
  });

  it("treats one IPv6 /64 as one network, however it is written", () => {
    const key = networkKey("2001:db8:aa:1::5", "s");
    expect(networkKey("2001:0db8:00aa:0001:ffff:1:2:3", "s")).toBe(key);
    expect(networkKey("2001:db8:aa:2::5", "s")).not.toBe(key);
  });

  it("treats an IPv4 address written the IPv6 way as that IPv4 address", () => {
    expect(networkKey("::ffff:203.0.113.9", "s")).toBe(networkKey("203.0.113.9", "s"));
  });

  it("is null without an address", () => {
    expect(networkKey(null, "s")).toBeNull();
  });
});

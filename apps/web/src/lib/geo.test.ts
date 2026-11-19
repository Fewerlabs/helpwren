import { describe, expect, it } from "vitest";

import { locationFromHeaders } from "./geo";

describe("locationFromHeaders", () => {
  it("reads Vercel's headers, decoding the city", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "BR",
      "x-vercel-ip-country-region": "SP",
      "x-vercel-ip-city": "S%C3%A3o%20Paulo",
    });
    expect(locationFromHeaders(headers)).toEqual({
      country: "BR",
      region: "SP",
      city: "São Paulo",
    });
  });

  it("takes Cloudflare's country when that is all there is", () => {
    expect(locationFromHeaders(new Headers({ "cf-ipcountry": "jp" }))).toEqual({
      country: "JP",
      region: null,
      city: null,
    });
  });

  it.each([
    ["no headers", {}],
    ["an unknown country", { "cf-ipcountry": "XX" }],
    ["Tor", { "cf-ipcountry": "T1" }],
    ["something that is not a code", { "x-vercel-ip-country": "United Kingdom" }],
  ])("knows nothing from %s", (_, headers: Record<string, string>) => {
    expect(locationFromHeaders(new Headers(headers))).toEqual({
      country: null,
      region: null,
      city: null,
    });
  });

  it("drops a city that cannot be decoded", () => {
    const headers = new Headers({ "x-vercel-ip-country": "GB", "x-vercel-ip-city": "%E0%A4%A" });
    expect(locationFromHeaders(headers).city).toBeNull();
  });
});

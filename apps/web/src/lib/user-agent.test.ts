import { describe, expect, it } from "vitest";

import { parseUserAgent } from "./user-agent";

describe("parseUserAgent", () => {
  it.each([
    [
      "Chrome on a Mac",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      { browser: "Chrome", os: "macOS", device: "desktop" },
    ],
    [
      "Safari on an iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      { browser: "Safari", os: "iOS", device: "mobile" },
    ],
    [
      "Safari on an iPad",
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      { browser: "Safari", os: "iPadOS", device: "tablet" },
    ],
    [
      "Edge on Windows",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      { browser: "Edge", os: "Windows", device: "desktop" },
    ],
    [
      "Firefox on Linux",
      "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
      { browser: "Firefox", os: "Linux", device: "desktop" },
    ],
    [
      "Samsung Internet on an Android phone",
      "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
      { browser: "Samsung Internet", os: "Android", device: "mobile" },
    ],
    [
      "Chrome on an Android tablet",
      "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      { browser: "Chrome", os: "Android", device: "tablet" },
    ],
    [
      "Chrome on an iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
      { browser: "Chrome", os: "iOS", device: "mobile" },
    ],
  ])("reads %s", (_, userAgent, expected) => {
    expect(parseUserAgent(userAgent)).toEqual(expected);
  });

  it("leaves unknown what it does not recognise", () => {
    expect(parseUserAgent("curl/8.7.1")).toEqual({ browser: null, os: null, device: null });
    expect(parseUserAgent(null)).toEqual({ browser: null, os: null, device: null });
  });
});

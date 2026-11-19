import { type VisitorDevice } from "@helpwren/core";

/** What a User-Agent says about the browser, as far as the team needs to know. */
export interface UserAgentDetails {
  browser: string | null;
  os: string | null;
  device: VisitorDevice | null;
}

// Order matters: Edge, Opera and Samsung Internet also call themselves Chrome, and every
// Chromium browser also calls itself Safari.
const browsers: readonly (readonly [RegExp, string])[] = [
  [/\bEdg(e|A|iOS)?\//, "Edge"],
  [/\b(OPR|Opera)\//, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\b(Firefox|FxiOS)\//, "Firefox"],
  [/\b(Chrome|CriOS|Chromium)\//, "Chrome"],
  [/\bVersion\/[\d.]+.*\bSafari\//, "Safari"],
];

const systems: readonly (readonly [RegExp, string])[] = [
  [/\bWindows\b/, "Windows"],
  [/\biPad\b/, "iPadOS"],
  [/\b(iPhone|iPod)\b/, "iOS"],
  [/\bAndroid\b/, "Android"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\b(Macintosh|Mac OS X)\b/, "macOS"],
  [/\bLinux\b/, "Linux"],
];

function firstMatch(text: string, list: readonly (readonly [RegExp, string])[]): string | null {
  return list.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/**
 * The browser, operating system and kind of device a User-Agent names. A few patterns cover the
 * browsers people use; anything else is left unknown rather than guessed. An iPad that asks for
 * the desktop site says it is a Mac, and is counted as one.
 */
export function parseUserAgent(userAgent: string | null): UserAgentDetails {
  if (!userAgent) return { browser: null, os: null, device: null };
  const os = firstMatch(userAgent, systems);
  const tablet =
    /\b(iPad|Tablet)\b/.test(userAgent) || (os === "Android" && !/\bMobile\b/.test(userAgent));
  // "Mobi" matches Mobile and Mobi alike, as browsers spell it either way.
  const mobile = /\bMobi|\b(iPhone|iPod)\b/.test(userAgent);
  return {
    browser: firstMatch(userAgent, browsers),
    os,
    device: tablet ? "tablet" : mobile ? "mobile" : os ? "desktop" : null,
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  detectPlatform,
  DISMISS_DAYS,
  dismissalHolds,
  installOffer,
  rememberDismissal,
  wasDismissed,
  type InstallOfferQuestion,
} from "./platform";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const DAY = 24 * 60 * 60 * 1000;

describe("detectPlatform", () => {
  it("knows an iPhone", () => {
    expect(detectPlatform(IPHONE, 5)).toBe("ios");
  });

  it("knows an iPad that asks for desktop sites, by its touch screen", () => {
    expect(detectPlatform(IPAD_AS_MAC, 5)).toBe("ios");
    expect(detectPlatform(IPAD_AS_MAC, 0)).toBe("desktop");
  });

  it("knows Android and everything else", () => {
    expect(detectPlatform(ANDROID, 5)).toBe("android");
    expect(detectPlatform(DESKTOP_CHROME, 0)).toBe("desktop");
  });
});

describe("installOffer", () => {
  const phone: InstallOfferQuestion = {
    platform: "android",
    standalone: false,
    phone: true,
    canPrompt: true,
    dismissed: false,
  };

  it("offers the browser's install dialog on a phone that has one", () => {
    expect(installOffer(phone)).toBe("prompt");
  });

  it("explains Add to Home Screen on an iPhone", () => {
    expect(installOffer({ ...phone, platform: "ios", canPrompt: false })).toBe("ios-steps");
  });

  it("offers nothing on a phone with no way to install", () => {
    expect(installOffer({ ...phone, canPrompt: false })).toBeNull();
  });

  it("offers nothing once installed, on a larger screen, or after Not now", () => {
    expect(installOffer({ ...phone, standalone: true })).toBeNull();
    expect(installOffer({ ...phone, phone: false })).toBeNull();
    expect(installOffer({ ...phone, dismissed: true })).toBeNull();
  });
});

describe("dismissal", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it(`holds for ${DISMISS_DAYS} days`, () => {
    const now = Date.now();
    expect(dismissalHolds(String(now - (DISMISS_DAYS - 1) * DAY), now)).toBe(true);
    expect(dismissalHolds(String(now - (DISMISS_DAYS + 1) * DAY), now)).toBe(false);
  });

  it("ignores nothing stored, something damaged, or a time in the future", () => {
    const now = Date.now();
    expect(dismissalHolds(null, now)).toBe(false);
    expect(dismissalHolds("soon", now)).toBe(false);
    expect(dismissalHolds(String(now + DAY), now)).toBe(false);
  });

  it("is remembered on this browser", () => {
    expect(wasDismissed()).toBe(false);
    rememberDismissal();
    expect(wasDismissed()).toBe(true);
  });

  it("does not break when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => {
      rememberDismissal();
    }).not.toThrow();
    expect(wasDismissed()).toBe(false);
  });
});

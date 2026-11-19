import { describe, expect, it } from "vitest";

import { widgetOrigin } from "./widget-origin";

const APP = "https://support.example.com";
const from = (origin?: string) =>
  new Request(`${APP}/api/widget`, origin ? { headers: { origin } } : {});

describe("widgetOrigin", () => {
  it("is the site the widget asked from", () => {
    expect(widgetOrigin(from("https://shop.example.com"), APP)).toBe("https://shop.example.com");
  });

  it("ignores the install itself, a request with no origin and anything not a web address", () => {
    expect(widgetOrigin(from(APP), APP)).toBeNull();
    expect(widgetOrigin(from(), APP)).toBeNull();
    expect(widgetOrigin(from("null"), APP)).toBeNull();
    expect(widgetOrigin(from("chrome-extension://abc"), APP)).toBeNull();
    expect(widgetOrigin(from(`https://${"a".repeat(300)}.com`), APP)).toBeNull();
  });
});

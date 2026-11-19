import { describe, expect, it } from "vitest";

import {
  browserLabel,
  countryFlag,
  formatDuration,
  localTime,
  placeLabel,
  shortUrl,
  visitorName,
} from "./format";

describe("formatting a visitor", () => {
  it("draws a country's flag from its code", () => {
    expect(countryFlag("gb")).toBe("🇬🇧");
  });

  it("says where they are with whatever is known", () => {
    expect(placeLabel({ country: "GB", region: "ENG", city: "London" })).toMatch(/^London, /);
    expect(placeLabel({ country: null, region: null, city: null })).toBeNull();
  });

  it("tells the time where they are, and nothing for a zone that is not one", () => {
    const noon = new Date("2026-06-01T12:00:00Z");
    expect(localTime("Asia/Tokyo", noon)).toMatch(/9:00/);
    expect(localTime("Mars/Olympus", noon)).toBeNull();
  });

  it("counts time on the site in minutes and hours", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    expect(formatDuration("2026-06-01T11:59:30Z", now)).toBe("under a minute");
    expect(formatDuration("2026-06-01T11:56:00Z", now)).toBe("4 min");
    expect(formatDuration("2026-06-01T10:55:00Z", now)).toBe("1 h 5 min");
    expect(formatDuration("2026-06-01T10:00:00Z", now)).toBe("2 h");
  });

  it("names a visitor by who they are, or by a short id", () => {
    expect(visitorName({ id: "3f9a2c1e-0000", contact: null })).toBe("Visitor 3F9A");
    expect(
      visitorName({
        id: "x",
        contact: {
          id: "c",
          name: null,
          email: "ada@example.com",
          phone: null,
          conversationCount: 1,
        },
      }),
    ).toBe("ada@example.com");
  });

  it("puts browser and system together", () => {
    expect(browserLabel({ browser: "Safari", os: "iOS" })).toBe("Safari on iOS");
    expect(browserLabel({ browser: null, os: "Linux" })).toBe("Linux");
    expect(shortUrl("https://shop.example.com/")).toBe("shop.example.com");
  });
});

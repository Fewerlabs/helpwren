import { describe, expect, it } from "vitest";

import { HelpwrenError } from "./errors";
import { parsePublicSettings, parseSettings } from "./settings";

const defaults = {
  brand: { name: "Helpwren" },
  guestDetails: "email",
  allowedDomains: [],
  sources: ["web"],
};

describe("parseSettings", () => {
  it("builds one object from the rows", () => {
    expect(
      parseSettings([
        { key: "brand", value: { name: "Acme" } },
        { key: "guest_details", value: "phone" },
        { key: "sources", value: ["web", "ios"] },
      ]),
    ).toEqual({
      brand: { name: "Acme" },
      guestDetails: "phone",
      allowedDomains: [],
      sources: ["web", "ios"],
    });
  });

  it("keeps a brand's own colour and greeting, and refuses a colour that is not hex", () => {
    const brand = { name: "Acme", accent: "#1d4ed8", greeting: "Welcome." };
    expect(parseSettings([{ key: "brand", value: brand }]).brand).toEqual(brand);
    expect(() =>
      parseSettings([{ key: "brand", value: { name: "Acme", accent: "blue" } }]),
    ).toThrow(HelpwrenError);
  });

  it("falls back to defaults when rows are missing", () => {
    expect(parseSettings([])).toEqual(defaults);
  });

  it("ignores keys this version does not know", () => {
    expect(parseSettings([{ key: "from_the_future", value: 1 }])).toEqual(defaults);
  });

  it("throws when a row has the wrong shape", () => {
    expect(() => parseSettings([{ key: "brand", value: { name: "" } }])).toThrow(HelpwrenError);
    expect(() => parseSettings([{ key: "guest_details", value: "fax" }])).toThrow(HelpwrenError);
  });
});

describe("parsePublicSettings", () => {
  it("leaves out settings that are not for everyone", () => {
    expect(parsePublicSettings([{ key: "sources", value: ["web", "ios"] }])).toEqual({
      brand: { name: "Helpwren" },
      guestDetails: "email",
    });
  });
});

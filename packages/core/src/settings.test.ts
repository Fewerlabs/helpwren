import { describe, expect, it } from "vitest";

import { HelpwrenError } from "./errors";
import { parsePublicSettings, parseSettings } from "./settings";

const defaults = {
  brand: { name: "Helpwren" },
  guestDetails: "email",
  defaultCountry: "NG",
  allowedDomains: [],
  sources: ["web"],
};

describe("parseSettings", () => {
  it("builds one object from the rows", () => {
    expect(
      parseSettings([
        { key: "brand", value: { name: "Acme" } },
        { key: "guest_details", value: "phone" },
        { key: "default_country", value: "gb" },
        { key: "sources", value: ["web", "ios"] },
      ]),
    ).toEqual({
      brand: { name: "Acme" },
      guestDetails: "phone",
      defaultCountry: "GB",
      allowedDomains: [],
      sources: ["web", "ios"],
    });
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
      defaultCountry: "NG",
    });
  });
});

import { describe, expect, it } from "vitest";

import { HelpwrenError } from "./errors";
import { parsePublicSettings } from "./settings";

describe("parsePublicSettings", () => {
  it("builds one object from the rows", () => {
    expect(parsePublicSettings([{ key: "brand", value: { name: "Acme" } }])).toEqual({
      brand: { name: "Acme" },
    });
  });

  it("falls back to defaults when a row is missing", () => {
    expect(parsePublicSettings([])).toEqual({ brand: { name: "Helpwren" } });
  });

  it("ignores keys this version does not know", () => {
    expect(parsePublicSettings([{ key: "from_the_future", value: 1 }])).toEqual({
      brand: { name: "Helpwren" },
    });
  });

  it("throws when a row has the wrong shape", () => {
    expect(() => parsePublicSettings([{ key: "brand", value: { name: "" } }])).toThrow(
      HelpwrenError,
    );
  });
});

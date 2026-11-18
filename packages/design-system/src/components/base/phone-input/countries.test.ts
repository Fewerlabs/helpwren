import { describe, expect, it } from "vitest";

import { toCountryCode } from "./countries";

describe("toCountryCode", () => {
  it.each([
    ["NG", "NG"],
    ["gb", "GB"],
  ])("accepts %s", (value, country) => {
    expect(toCountryCode(value)).toBe(country);
  });

  it.each(["XX", "Nigeria", "+234", ""])("rejects %j", (value) => {
    expect(toCountryCode(value)).toBeUndefined();
  });
});

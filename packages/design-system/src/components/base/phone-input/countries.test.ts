import { describe, expect, it } from "vitest";

import { countryOfLocale } from "./countries";

describe("countryOfLocale", () => {
  it.each([
    ["en-GB", "GB"],
    ["fr-CA", "CA"],
    ["pt-BR", "BR"],
  ])("reads the country out of %s", (locale, country) => {
    expect(countryOfLocale(locale)).toBe(country);
  });

  it.each(["en", "es-419", "not a locale", ""])("finds no country in %j", (locale) => {
    expect(countryOfLocale(locale)).toBeUndefined();
  });
});

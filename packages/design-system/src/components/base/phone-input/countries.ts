import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";

export type { CountryCode };

export interface Country {
  code: CountryCode;
  name: string;
  /** The international dialling code, without the plus. */
  callingCode: string;
  flag: string;
}

/**
 * Checks a country code that came from outside the type system, such as a setting, and returns
 * it only if it is a country with a dialling code. Use the result as a `defaultCountry`.
 */
export function toCountryCode(value: string): CountryCode | undefined {
  const upper = value.toUpperCase();
  return getCountries().find((code) => code === upper);
}

/** The flag emoji for an ISO country code, built from its two regional indicator letters. */
export function flagOf(code: string): string {
  const letters = code.toUpperCase();
  return String.fromCodePoint(
    0x1f1e6 + letters.charCodeAt(0) - 65,
    0x1f1e6 + letters.charCodeAt(1) - 65,
  );
}

/** Every country that has a dialling code, named in the given language and sorted by name. */
export function listCountries(
  locale: string,
  only?: readonly CountryCode[],
  preferred: readonly CountryCode[] = [],
): Country[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const allowed = only ? new Set<CountryCode>(only) : undefined;
  const countries = getCountries()
    .filter((code) => allowed?.has(code) ?? true)
    .map((code) => ({
      code,
      name: names.of(code) ?? code,
      callingCode: getCountryCallingCode(code),
      flag: flagOf(code),
    }))
    .sort((first, second) => first.name.localeCompare(second.name, locale));

  const top = preferred.flatMap((code) => countries.filter((country) => country.code === code));
  return [...top, ...countries.filter((country) => !preferred.includes(country.code))];
}

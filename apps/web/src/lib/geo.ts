/** Where a request came from, as the hosting platform worked it out. */
export interface RequestLocation {
  /** A two-letter country code, such as `GB`. */
  country: string | null;
  region: string | null;
  city: string | null;
}

const COUNTRY = /^[A-Z]{2}$/;
// Cloudflare's codes for "unknown" and "Tor", which are not countries.
const NOT_COUNTRIES = new Set(["XX", "T1"]);
const MAX_LENGTH = 100;

function text(value: string | null, encoded: boolean): string | null {
  if (!value) return null;
  let decoded = value;
  if (encoded) {
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  const trimmed = decoded.trim().slice(0, MAX_LENGTH);
  return trimmed === "" ? null : trimmed;
}

/**
 * The visitor's country, region and city, from the headers Vercel or Cloudflare add to each
 * request. Elsewhere there are none and the location stays unknown: there is no lookup of the
 * address, and the address itself is never read.
 */
export function locationFromHeaders(headers: Headers): RequestLocation {
  const country = (headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry") ?? "")
    .trim()
    .toUpperCase();
  if (!COUNTRY.test(country) || NOT_COUNTRIES.has(country)) {
    return { country: null, region: null, city: null };
  }
  return {
    country,
    region: text(headers.get("x-vercel-ip-country-region"), false),
    // Vercel encodes the city, as it may hold any letter: `S%C3%A3o%20Paulo`.
    city: text(headers.get("x-vercel-ip-city"), true),
  };
}

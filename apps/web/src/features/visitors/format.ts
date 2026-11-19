import { type Visitor, type VisitorDevice } from "@helpwren/core";
import { type IconName } from "@helpwren/design-system";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The regional indicator letter that stands for an ASCII capital, two of which make a flag. */
const indicator = (letter: number) => 0x1f1e6 + letter - 65;

/** A country's flag, drawn from its two-letter code by the system's emoji font. */
export function countryFlag(code: string): string {
  const upper = code.toUpperCase();
  return String.fromCodePoint(indicator(upper.charCodeAt(0)), indicator(upper.charCodeAt(1)));
}

let regionNames: Intl.DisplayNames | undefined;

/** A country's name in the reader's language, such as "United Kingdom" for `GB`. */
export function countryName(code: string): string {
  regionNames ??= new Intl.DisplayNames(undefined, { type: "region" });
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

let languageNames: Intl.DisplayNames | undefined;

/** A language tag in words, such as "British English" for `en-GB`. */
export function languageName(tag: string): string {
  languageNames ??= new Intl.DisplayNames(undefined, { type: "language" });
  try {
    return languageNames.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/** Where a visitor is, as people say it: the city and country, whichever are known. */
export function placeLabel(location: Visitor["location"]): string | null {
  const country = location.country ? countryName(location.country) : null;
  return [location.city, country].filter(Boolean).join(", ") || null;
}

/** The time it is where the visitor is, such as "14:05", or `null` for an unknown zone. */
export function localTime(timezone: string, now = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(now);
  } catch {
    return null;
  }
}

/** How long since a moment, for time on the site: "under a minute", "4 min", "1 h 5 min". */
export function formatDuration(since: string, now = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - new Date(since).getTime());
  if (elapsed < MINUTE) return "under a minute";
  const minutes = Math.floor((elapsed % HOUR) / MINUTE);
  const hours = Math.floor(elapsed / HOUR);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export const devices: Record<VisitorDevice, { label: string; icon: IconName }> = {
  desktop: { label: "Desktop", icon: "desktop" },
  mobile: { label: "Phone", icon: "device-mobile" },
  tablet: { label: "Tablet", icon: "device-tablet" },
};

/** The browser and system together, such as "Safari on iOS". */
export function browserLabel({ browser, os }: Pick<Visitor, "browser" | "os">): string | null {
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}

/** What to call a visitor: who they are if known, otherwise "Visitor" and a short id. */
export function visitorName(visitor: Pick<Visitor, "id" | "contact">): string {
  const known = visitor.contact?.name ?? visitor.contact?.email ?? visitor.contact?.phone;
  return (
    known ??
    `Visitor ${visitor.id
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 4)
      .toUpperCase()}`
  );
}

/** A page address without its scheme, which is how people read one. */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

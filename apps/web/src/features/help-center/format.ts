const longDate = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" });

/** A date written out in full: "November 18, 2026". The same on the server and in the browser. */
export function formatDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** "1 article", "3 articles". */
export function countArticles(count: number): string {
  return count === 1 ? "1 article" : `${count} articles`;
}

/** About how long an article takes to read, at an unhurried 200 words a minute. */
export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

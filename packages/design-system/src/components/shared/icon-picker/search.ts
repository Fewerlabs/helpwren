/** One icon the picker offers. */
export interface IconEntry {
  /** Its Phosphor name, such as `rocket-launch`. This is what is stored. */
  name: string;
  /** Its name to read and show, such as "Rocket launch". */
  label: string;
  /** Phosphor's tags and categories for it, and any older name, in lower case. */
  keywords: readonly string[];
  /** The name it had before Phosphor renamed it, which may still be stored. */
  alias?: string | undefined;
}

/**
 * The icons that match what was typed, best first. Every word typed must appear in the icon's
 * name or one of its keywords, so "money" finds coins and wallets as well as icons named for it.
 * Icons whose name starts with the search come first, then those named for every word, then
 * those found only by their keywords. Each group keeps the catalogue's alphabetical order.
 */
export function matchIcons(entries: readonly IconEntry[], query: string): readonly IconEntry[] {
  const text = query.trim().toLowerCase();
  if (text === "") return entries;
  const words = text.split(/[\s-]+/).filter(Boolean);
  const phrase = words.join("-");

  const ranked: IconEntry[][] = [[], [], []];
  for (const entry of entries) {
    if (entry.name.startsWith(phrase)) {
      ranked[0]?.push(entry);
    } else if (words.every((word) => entry.name.includes(word))) {
      ranked[1]?.push(entry);
    } else if (
      words.every(
        (word) =>
          entry.name.includes(word) || entry.keywords.some((keyword) => keyword.includes(word)),
      )
    ) {
      ranked[2]?.push(entry);
    }
  }
  return ranked.flat();
}

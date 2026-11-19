import { z } from "zod";

/** The longest slug the database accepts for an article. Collections stop at 80. */
export const SLUG_MAX_LENGTH = 120;

/** Part of an address: lower case words joined by hyphens, such as `reset-your-password`. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(SLUG_MAX_LENGTH);

/**
 * A slug made from a title: "Réserver une table!" becomes `reserver-une-table`. Text with no
 * Latin letters or digits at all gives an empty string, and the caller picks a fallback.
 */
export function slugify(text: string, maxLength = 80): string {
  return (
    text
      .normalize("NFKD")
      // The accents that normalising split off from their letters.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, maxLength)
      .replace(/^-+|-+$/g, "")
  );
}

/** Postgres's code for a value that is already in use. */
const TAKEN = "23505";

type Attempt<T> = { data: T; error: null } | { data: null; error: { code?: string } };

/**
 * Inserts a row under a slug made from its name, and if that slug is taken tries `name-2`,
 * `name-3` and so on. Gives back the last attempt, which the caller checks as usual.
 */
export async function insertWithFreeSlug<T>(
  base: string,
  insert: (slug: string) => PromiseLike<Attempt<T>>,
): Promise<Attempt<T>> {
  let attempt = await insert(base);
  for (let suffix = 2; suffix <= 20 && attempt.error?.code === TAKEN; suffix += 1) {
    attempt = await insert(`${base}-${suffix}`);
  }
  return attempt;
}

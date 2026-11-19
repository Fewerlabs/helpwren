// The rows-per-page choice is a person's preference for one table, so it is kept in this
// browser under a key the table names. Storage can be missing or refuse to work (a private
// window, blocked site data), and then the table simply uses its default.

const PREFIX = "helpwren:page-size:";

/** The size last chosen for this table, if it is still one of `options`. */
export function readPageSize(key: string, options?: readonly number[]): number | undefined {
  try {
    const stored = Number(window.localStorage.getItem(PREFIX + key));
    if (!Number.isInteger(stored) || stored <= 0) return undefined;
    return options === undefined || options.includes(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export function rememberPageSize(key: string, size: number): void {
  try {
    window.localStorage.setItem(PREFIX + key, String(size));
  } catch {
    // Not remembered; the choice still holds until the page is left.
  }
}

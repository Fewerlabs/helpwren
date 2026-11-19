import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** The start of every visitors query's key, so one refresh reaches them all. */
export const VISITORS_QUERY_KEY = ["visitors"] as const;

/** Who counts as on the site: checked in within this long. The chat checks in every minute. */
export const ACTIVE_WITHIN_SECONDS = 120;

/** How often the live list and an open visitor are asked for again while the page is open. */
export const REFRESH_EVERY_MS = 15_000;

const SELECTED = "visitor";

/** The open visitor, kept in the address so a reload lands on the same one. */
export function useSelectedVisitor() {
  const selected = useSearchParams().get(SELECTED);

  const select = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set(SELECTED, id);
    } else {
      url.searchParams.delete(SELECTED);
    }
    window.history.pushState(null, "", url);
  }, []);

  return [selected, select] as const;
}

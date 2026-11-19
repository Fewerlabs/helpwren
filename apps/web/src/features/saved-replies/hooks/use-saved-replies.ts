import { fillPlaceholders, type PlaceholderValues } from "@helpwren/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/** Every query about saved replies sits under this, so one invalidation refreshes them all. */
export const SAVED_REPLIES_QUERY_KEY = ["saved-replies"] as const;

/**
 * Every saved reply the signed-in team member may use. A hook, not a `QueryList`, because no
 * one list draws it: the reply box's picker filters it as each key is typed, and it is only
 * loaded once the picker is first wanted.
 */
export function useSavedReplies(enabled: boolean) {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...SAVED_REPLIES_QUERY_KEY, "all"],
    queryFn: () => getClient().savedReplies.list(),
    enabled,
  });
}

/** Reloads everything about saved replies, after one is added, changed or deleted. */
export function useRefreshSavedReplies() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: SAVED_REPLIES_QUERY_KEY });
  }, [queryClient]);
}

/**
 * Fills a reply's placeholders for the open conversation. The brand's name comes from the
 * install's public settings, which the inbox does not otherwise load.
 */
export function useFillPlaceholders(values: PlaceholderValues, enabled: boolean) {
  const getClient = useHelpwren();
  const brand = useQuery({
    queryKey: ["settings", "public"],
    queryFn: () => getClient().settings.getPublic(),
    select: (settings) => settings.brand.name,
    enabled,
  });
  const brandName = brand.data;
  return useCallback(
    (body: string) => fillPlaceholders(body, { ...values, brand: { name: brandName } }),
    [brandName, values],
  );
}

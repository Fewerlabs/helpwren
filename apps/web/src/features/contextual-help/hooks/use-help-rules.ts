import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { refreshContextualHelp } from "../actions";

/** The start of every query key for the rules. */
export const HELP_RULES_QUERY_KEY = ["help-rules"] as const;

/** After a rule changes: the list is read again, and so is what the server keeps. */
export function useHelpRulesChanged() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: HELP_RULES_QUERY_KEY }),
      refreshContextualHelp(),
    ]);
  }, [queryClient]);
}

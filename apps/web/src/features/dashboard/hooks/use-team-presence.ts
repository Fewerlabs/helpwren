import { useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/**
 * Counts the signed-in team member as online while any dashboard page is open, so the chat can
 * tell visitors the team is around. A background tab still counts: its notifications still
 * reach them.
 */
export function useTeamPresence() {
  const getClient = useHelpwren();

  useEffect(() => {
    let stopped = false;
    let leave: (() => Promise<void>) | undefined;

    void getClient()
      .presence.team.join()
      .then((unsubscribe) => {
        if (stopped) void unsubscribe();
        else leave = unsubscribe;
      })
      // Visitors then see the reply-time line instead of "We're online". Nothing else breaks.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void leave?.();
    };
  }, [getClient]);
}

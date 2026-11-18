import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

const unreadKey = ["dashboard", "unread"] as const;

/** How many messages are waiting for the team, kept current as conversations change. */
export function useTeamUnread(): number {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();

  useEffect(() => {
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getClient()
      .conversations.subscribe({ inbox: true }, () => {
        void queryClient.invalidateQueries({ queryKey: unreadKey });
      })
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      // Without live updates the count is still right after each page load.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [getClient, queryClient]);

  const unread = useQuery({
    queryKey: unreadKey,
    queryFn: () => getClient().conversations.unreadCount("agents"),
  });
  return unread.data ?? 0;
}

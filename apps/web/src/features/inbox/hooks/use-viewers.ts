import { useEffect, useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/**
 * The team members who have a conversation open now, the signed-in one included, so two people
 * do not answer the same customer. Joining shows the signed-in team member to the others.
 */
export function useViewers(conversationId: string): string[] {
  const getClient = useHelpwren();
  const [viewers, setViewers] = useState<string[]>([]);

  useEffect(() => {
    let stopped = false;
    let leave: (() => Promise<void>) | undefined;

    void getClient()
      .presence.viewing(conversationId, setViewers)
      .then((unsubscribe) => {
        if (stopped) void unsubscribe();
        else leave = unsubscribe;
      })
      // Without live updates the conversation still works; nobody else is shown.
      .catch(() => undefined);

    return () => {
      stopped = true;
      setViewers([]);
      void leave?.();
    };
  }, [conversationId, getClient]);

  return viewers;
}

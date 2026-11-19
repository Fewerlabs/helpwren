import { useEffect, useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { useHostVisible, usePreview, useShowing } from "../store/chat-store";

/**
 * Whether anyone on the team has the dashboard open: `undefined` until known. It listens only
 * while the chat is open and its page is showing, so a page view with the chat closed holds no
 * connection, which keeps an install inside Supabase's free plan. A visitor who has not written
 * listens with no session; they can count the team but never be counted.
 */
export function useTeamOnline(): boolean | undefined {
  const getClient = useHelpwren();
  const preview = usePreview();
  const showing = useShowing();
  const hostVisible = useHostVisible();
  const [online, setOnline] = useState<boolean | undefined>(undefined);
  const live = !preview && showing && hostVisible;

  useEffect(() => {
    if (!live) return undefined;
    let stopped = false;
    let leave: (() => Promise<void>) | undefined;

    void getClient()
      .presence.team.watch((count) => {
        setOnline(count > 0);
      })
      .then((unsubscribe) => {
        if (stopped) void unsubscribe();
        else leave = unsubscribe;
      })
      // Unknown, the chat shows the reply-time line, which is never wrong.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void leave?.();
    };
  }, [getClient, live]);

  return live ? online : undefined;
}

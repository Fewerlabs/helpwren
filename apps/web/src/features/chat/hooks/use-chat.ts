import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { usePreview } from "../store/chat-store";

export const chatKeys = {
  session: ["chat", "session"] as const,
  conversations: ["chat", "conversations"] as const,
};

/** The visitor's session, or `null` if they have never written. Opening the chat creates none. */
export function useSession() {
  const getClient = useHelpwren();
  const preview = usePreview();
  return useQuery({
    queryKey: chatKeys.session,
    queryFn: () => getClient().sessions.current(),
    staleTime: Infinity,
    // A preview shows the chat as a new visitor would see it, whoever is looking.
    enabled: !preview,
  });
}

/** The visitor's conversations, newest first. Empty, without asking, when there is no session. */
export function useConversations() {
  const getClient = useHelpwren();
  const session = useSession();
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => (await getClient().conversations.list({ limit: 50 })).items,
    enabled: Boolean(session.data),
  });
}

/** Reloads the visitor's conversations, for when one of them has changed. */
export function useRefreshConversations() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
  }, [queryClient]);
}

/** Keeps the visitor's conversations fresh as the team replies. */
export function useLiveConversations(contactId: string | undefined) {
  const getClient = useHelpwren();
  const refresh = useRefreshConversations();

  useEffect(() => {
    if (!contactId) return undefined;
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getClient()
      .conversations.subscribe({ contactId }, refresh)
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      // Without live updates the list still works; it refreshes when it is next opened.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [contactId, getClient, refresh]);
}

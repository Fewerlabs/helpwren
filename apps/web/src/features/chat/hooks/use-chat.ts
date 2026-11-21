import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { usePreview } from "../store/chat-store";

export const chatKeys = {
  session: ["chat", "session"] as const,
  details: ["chat", "details"] as const,
  conversations: ["chat", "conversations"] as const,
};

/**
 * The visitor's session, or `null` if they have never written. Opening the chat creates none,
 * but brings back a guest whose session the browser lost and whose key it kept. A session that
 * cannot be checked, because the network is not there, is asked about again until it can be,
 * never taken for none: a visitor taken for new would be asked who they are, and their next
 * message would start a guest in place of the one they are.
 */
export function useSession() {
  const getClient = useHelpwren();
  const preview = usePreview();
  return useQuery({
    queryKey: chatKeys.session,
    queryFn: () => getClient().sessions.resume(),
    staleTime: Infinity,
    // Up to half a minute apart, and not while the browser says it is offline.
    retry: true,
    // A preview shows the chat as a new visitor would see it, whoever is looking.
    enabled: !preview,
  });
}

/**
 * Looks for the visitor's session again as soon as it ends while the chat is open, as when a
 * refresh is refused, so a guest is brought back before they write. Used once, by the chat.
 */
export function useSessionEnd() {
  const getClient = useHelpwren();
  const preview = usePreview();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (preview) return undefined;
    return getClient().sessions.onSignedOut(() => {
      // A look already under way is left to finish rather than started again.
      for (const queryKey of [chatKeys.session, chatKeys.conversations]) {
        void queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false });
      }
    });
  }, [getClient, preview, queryClient]);
}

/** What the visitor has said about themselves, so someone who has is not asked again. */
export function useOwnDetails() {
  const getClient = useHelpwren();
  const session = useSession();
  return useQuery({
    queryKey: [...chatKeys.details, session.data?.id],
    queryFn: () => getClient().sessions.details(),
    enabled: Boolean(session.data),
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

import { type ConversationStatus } from "@helpwren/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/** Which conversations the list shows: those still needing the team, or all of them. */
export type InboxFilter = "open" | "all";

const statusesFor: Record<InboxFilter, readonly ConversationStatus[] | undefined> = {
  open: ["open", "pending"],
  all: undefined,
};

const inboxKey = ["inbox", "conversations"] as const;

export function useInboxConversations(filter: InboxFilter) {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...inboxKey, filter],
    queryFn: async () =>
      (await getClient().conversations.list({ limit: 50, status: statusesFor[filter] })).items,
  });
}

/** Reloads the inbox's conversations, for when one of them has changed. */
export function useRefreshInbox() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: inboxKey });
  }, [queryClient]);
}

/** Keeps the inbox fresh as conversations start and messages arrive. */
export function useLiveInbox() {
  const getClient = useHelpwren();
  const refresh = useRefreshInbox();

  useEffect(() => {
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getClient()
      .conversations.subscribe({ inbox: true }, refresh)
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      // Without live updates the inbox still works; it refreshes when it is next loaded.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [getClient, refresh]);
}

const SELECTED = "c";

/**
 * The open conversation, kept in the address (`/dashboard/inbox?c=<id>`) so that a reload, the back
 * button and a shared link all land on the same conversation.
 */
export function useSelectedConversation() {
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

import { type ConversationStatus } from "@helpwren/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/** The inbox's views, in the order its navigation shows them. */
export const inboxViews = [
  { id: "open", label: "Open", icon: "tray", statuses: ["open"] },
  { id: "waiting", label: "Waiting", icon: "clock", statuses: ["pending"] },
  { id: "resolved", label: "Resolved", icon: "check-circle", statuses: ["resolved", "closed"] },
  { id: "all", label: "All", icon: "archive", statuses: undefined },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: string;
  statuses: readonly ConversationStatus[] | undefined;
}[];

export type InboxView = (typeof inboxViews)[number];

const inboxKey = ["inbox"] as const;

export function useInboxConversations(view: InboxView) {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...inboxKey, "conversations", view.id],
    queryFn: async () =>
      (await getClient().conversations.list({ limit: 50, status: view.statuses })).items,
  });
}

/** The fewest characters worth searching for. The database finds nothing below this. */
export const MIN_SEARCH_LENGTH = 2;

/** Conversations found by who they are with or what was said. Idle until there is enough to search for. */
export function useConversationSearch(text: string) {
  const getClient = useHelpwren();
  const query = text.trim();
  return useQuery({
    queryKey: [...inboxKey, "search", query],
    queryFn: () => getClient().conversations.search(query),
    enabled: query.length >= MIN_SEARCH_LENGTH,
  });
}

/** How many conversations each view holds. */
export function useViewCounts(): Partial<Record<InboxView["id"], number>> {
  const getClient = useHelpwren();
  const counts = useQuery({
    queryKey: [...inboxKey, "counts"],
    queryFn: () => getClient().conversations.countByStatus(),
  });
  if (!counts.data) return {};

  const { open, pending, resolved, closed } = counts.data;
  return {
    open,
    waiting: pending,
    resolved: resolved + closed,
    all: open + pending + resolved + closed,
  };
}

/** Reloads the inbox's conversations and counts, for when a conversation has changed. */
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

const VIEW = "view";
const SELECTED = "c";

/** The view in the address (`/dashboard/inbox?view=waiting`). Open, unless it says otherwise. */
export function useInboxView(): InboxView {
  const id = useSearchParams().get(VIEW);
  return inboxViews.find((view) => view.id === id) ?? inboxViews[0];
}

/** The address of a view, for its link in the navigation. */
export function viewHref(view: InboxView): string {
  return view.id === "open" ? "/dashboard/inbox" : `/dashboard/inbox?${VIEW}=${view.id}`;
}

/**
 * The open conversation, kept in the address (`/dashboard/inbox?c=<id>`) so that a reload, the
 * back button and a shared link all land on the same conversation.
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

import {
  type ChangeConversationResult,
  type ConversationChanges,
  type ConversationFilter,
  type ConversationStatus,
  type ConversationWithContact,
  type Team,
} from "@helpwren/core";
import { toast, type IconName } from "@helpwren/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { changeMessage, type InboxChange } from "../change-message";

/** Statuses that still need the team: not yet resolved or closed. */
const ACTIVE: readonly ConversationStatus[] = ["open", "pending"];

/**
 * The inbox's views, in the order its navigation shows them. Each is a filter; `mine` needs to
 * know who is asking.
 */
export const inboxViews = [
  {
    id: "mine",
    label: "My inbox",
    icon: "user",
    filter: (agentId: string): ConversationFilter => ({ assigneeId: agentId, status: ACTIVE }),
  },
  {
    id: "unassigned",
    label: "Unassigned",
    icon: "tray",
    filter: (): ConversationFilter => ({ assigneeId: null, status: ACTIVE }),
  },
  {
    id: "open",
    label: "Open",
    icon: "chat-circle",
    filter: (): ConversationFilter => ({ status: ["open"] }),
  },
  {
    id: "waiting",
    label: "Waiting",
    icon: "clock",
    filter: (): ConversationFilter => ({ status: ["pending"] }),
  },
  {
    id: "tickets",
    label: "Tickets",
    icon: "ticket",
    // Every ticket, whatever its status: the table shows the status of each.
    filter: (): ConversationFilter => ({ type: "ticket" }),
  },
  {
    id: "resolved",
    label: "Resolved",
    icon: "check-circle",
    filter: (): ConversationFilter => ({ status: ["resolved", "closed"] }),
  },
  { id: "all", label: "All", icon: "archive", filter: (): ConversationFilter => ({}) },
] as const satisfies readonly InboxView[];

/** One way of looking at the inbox: a name, and the filter that decides what it holds. */
export interface InboxView {
  id: string;
  label: string;
  icon: IconName;
  filter: (agentId: string) => ConversationFilter;
}

/** What still needs a team, as a view of its own in the navigation. */
export function teamView(team: Team): InboxView {
  return {
    id: `team:${team.id}`,
    label: team.name,
    icon: "users",
    filter: () => ({ teams: [team.id], status: ACTIVE }),
  };
}

/** The view shown when the address names none. */
const DEFAULT_VIEW = inboxViews[2];

const inboxKey = ["inbox"] as const;

/** The fewest characters worth searching for. The database finds nothing below this. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * The open conversation, loaded by its id and not looked up in the list on screen. It stays
 * open when a change, such as resolving it, takes it out of the current view, and it opens
 * from a link whichever view that link lands on.
 *
 * A hook and not `QueryDetail`, because two panels side by side draw from the one result.
 */
export function useOpenConversation(id: string | null) {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...inboxKey, "open", id],
    queryFn: () => getClient().conversations.get(id ?? ""),
    enabled: id !== null,
    // The previous conversation stays on screen until the next one has loaded.
    placeholderData: (previous) => previous,
  });
}

/** How many conversations each of these views holds, by the view's id. */
export function useViewCounts(
  views: readonly InboxView[],
  agentId: string,
): Partial<Record<string, number>> {
  const getClient = useHelpwren();
  const counts = useQuery({
    queryKey: [...inboxKey, "counts", agentId, views.map((view) => view.id)],
    queryFn: async () => {
      const client = getClient();
      const entries = await Promise.all(
        views.map(
          async (view) =>
            [view.id, await client.conversations.count(view.filter(agentId))] as const,
        ),
      );
      return Object.fromEntries(entries);
    },
  });
  return counts.data ?? {};
}

/** The start of every inbox query's key, so one refresh reaches them all. */
export const INBOX_QUERY_KEY = inboxKey;

/** How the contact rated a conversation, if they have. Refreshed with the rest of the inbox. */
export function useRating(conversationId: string) {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...inboxKey, "rating", conversationId],
    queryFn: () => getClient().ratings.get(conversationId),
  });
}

const CHANGE_FAILED = "The change could not be saved. Try again.";
const CHANGE_NOT_FOUND = "This conversation is no longer there to change.";

/** Tells the person how a change ended. Without it a change that failed would pass unnoticed. */
function announceChange(change: InboxChange, result: ChangeConversationResult) {
  if (result.ok) {
    toast.success(changeMessage(change, result.conversation));
  } else {
    toast.error(CHANGE_NOT_FOUND);
  }
}

/** Changes any conversation by its id, for a table where each row can be changed in place. */
export function useChangeConversations() {
  const getClient = useHelpwren();
  const refresh = useRefreshInbox();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ConversationChanges }) =>
      getClient().conversations.update(id, changes),
    onSuccess: (result, { changes }) => {
      announceChange(changes, result);
    },
    onError: () => {
      toast.error(CHANGE_FAILED);
    },
    onSettled: refresh,
  });
}

/** The install's teams, for giving a conversation to one and for a view of each. */
export function useTeams() {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: ["teams"],
    queryFn: () => getClient().teams.list(),
    staleTime: 5 * 60_000,
  });
}

/** Everyone on the team, for choosing an assignee and naming who wrote a note. */
export function useTeam() {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: ["team"],
    queryFn: () => getClient().agents.list(),
    staleTime: 5 * 60_000,
  });
}

/** Changes a conversation, then refreshes every list and count it might now belong to. */
export function useChangeConversation(conversationId: string) {
  const getClient = useHelpwren();
  const refresh = useRefreshInbox();
  return useMutation({
    mutationFn: (change: InboxChange) =>
      "ticketSubject" in change
        ? getClient().conversations.convertToTicket(conversationId, change.ticketSubject)
        : getClient().conversations.update(conversationId, change),
    onSuccess: (result, change) => {
      // The ticket dialog says so itself, in place, when a conversation cannot become a ticket.
      if (result.ok || !("ticketSubject" in change)) announceChange(change, result);
    },
    onError: (_error, change) => {
      if (!("ticketSubject" in change)) toast.error(CHANGE_FAILED);
    },
    onSettled: refresh,
  });
}

/**
 * Puts a conversation the list already holds where `useOpenConversation` looks, so that
 * choosing it opens it at once and the fresh copy arrives behind it.
 */
export function useShowConversation() {
  const queryClient = useQueryClient();
  return useCallback(
    (conversation: ConversationWithContact) => {
      queryClient.setQueryData([...inboxKey, "open", conversation.id], conversation);
    },
    [queryClient],
  );
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

/**
 * The view in the address (`/dashboard/inbox?view=waiting`), from the ones given. Open, unless
 * the address names another.
 */
export function useInboxView(views: readonly InboxView[]): InboxView {
  const id = useSearchParams().get(VIEW);
  return views.find((view) => view.id === id) ?? DEFAULT_VIEW;
}

/** The address of a view, for its link in the navigation. */
export function viewHref(view: InboxView): string {
  return view.id === DEFAULT_VIEW.id ? "/dashboard/inbox" : `/dashboard/inbox?${VIEW}=${view.id}`;
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

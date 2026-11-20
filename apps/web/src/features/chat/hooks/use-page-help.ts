import { useQuery } from "@tanstack/react-query";

import { useHelpwren } from "@/lib/helpwren-context";

import { useHelpFilter, usePage, usePreview } from "../store/chat-store";
import { useSession } from "./use-chat";

/**
 * How to ask for the help for the page the chat is on: the page's own filter, or the team's
 * first rule that matches, or a search on the page's title. Asked again when the page, its
 * filter or who is signed in changes, since a verified user's audience can change the answer.
 * Nothing is asked in a preview, or with no page and no filter, as in an app that sends neither.
 */
export function usePageHelpQuery() {
  const getClient = useHelpwren();
  const preview = usePreview();
  const page = usePage();
  const filter = useHelpFilter();
  const session = useSession();
  const sessionId = session.data?.id ?? null;

  return {
    queryKey: ["chat", "help", "page", page?.url, page?.title, filter, sessionId] as const,
    queryFn: () =>
      getClient().articles.forPage({
        ...(page ? { page } : {}),
        ...(filter ? { filter } : {}),
      }),
    enabled: !preview && !session.isPending && (page !== null || filter !== null),
    // The server keeps a page's help for a minute too.
    staleTime: 60_000,
  };
}

/** The help for the page the chat is on, and what decided it. */
export function usePageHelp() {
  return useQuery(usePageHelpQuery());
}

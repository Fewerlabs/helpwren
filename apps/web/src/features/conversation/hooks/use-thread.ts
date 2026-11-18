import { type Message, type Page } from "@helpwren/core";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

const messagesKey = (conversationId: string) => ["conversation", "messages", conversationId];

type MessagePages = InfiniteData<Page<Message>, string | undefined>;

/** A conversation's messages. The first page is the most recent; `fetchNextPage` loads older. */
export function useMessages(conversationId: string) {
  const getClient = useHelpwren();
  return useInfiniteQuery({
    queryKey: messagesKey(conversationId),
    queryFn: ({ pageParam }) => getClient().messages.list(conversationId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (oldestLoaded) => oldestLoaded.nextCursor,
    select: (data) => [...data.pages].reverse().flatMap((page) => page.items),
  });
}

/** Adds a message to the loaded ones, unless it is already there. */
function addMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<MessagePages>(messagesKey(message.conversationId), (data) => {
    const [latest, ...older] = data?.pages ?? [];
    if (!data || !latest) return data;
    if (data.pages.some((page) => page.items.some((item) => item.id === message.id))) return data;
    return { ...data, pages: [{ ...latest, items: [...latest.items, message] }, ...older] };
  });
}

export function useSendMessage(conversationId: string) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => getClient().messages.send(conversationId, body),
    onSuccess: (result) => {
      if (result.ok) addMessage(queryClient, result.message);
    },
  });
}

export interface LiveThreadOptions {
  /** Whether a message came from the person looking at the screen, or their side. */
  isOwn: (message: Message) => boolean;
  /** Called after the conversation has been marked as read, to refresh any unread counts. */
  onRead?: (() => void) | undefined;
}

/**
 * While a conversation is open: shows new messages as they arrive, and marks the conversation
 * as read, both on opening it and whenever the other side writes.
 */
export function useLiveThread(conversationId: string, options: LiveThreadOptions) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  // The latest callbacks, without restarting the subscription each time a parent re-renders.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const client = getClient();
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    const markRead = () => {
      void client.conversations
        .markRead(conversationId)
        .then(() => latest.current.onRead?.())
        // Unread counts are a nicety. A failure here must not break the conversation.
        .catch(() => undefined);
    };

    markRead();
    void client.messages
      .subscribe(conversationId, (message) => {
        addMessage(queryClient, message);
        if (!latest.current.isOwn(message)) markRead();
      })
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
          // Catch anything sent between loading the messages and starting to listen.
          void queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
        }
      })
      // Without live updates the conversation still works; messages show on the next load.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [conversationId, getClient, queryClient]);
}

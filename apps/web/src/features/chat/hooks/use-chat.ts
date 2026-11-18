import { type Message, type Page } from "@helpwren/core";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { getChatClient } from "../client";

export const chatKeys = {
  session: ["chat", "session"] as const,
  conversations: ["chat", "conversations"] as const,
  messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
};

type MessagePages = InfiniteData<Page<Message>, string | undefined>;

/** The visitor's session, or `null` if they have never written. Opening the chat creates none. */
export function useSession() {
  return useQuery({
    queryKey: chatKeys.session,
    queryFn: () => getChatClient().sessions.current(),
    staleTime: Infinity,
  });
}

/** The visitor's conversations, newest first. Empty, without asking, when there is no session. */
export function useConversations() {
  const session = useSession();
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => (await getChatClient().conversations.list({ limit: 50 })).items,
    enabled: Boolean(session.data),
  });
}

/** A conversation's messages. The first page is the most recent; `fetchNextPage` loads older. */
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      getChatClient().messages.list(conversationId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (oldestLoaded) => oldestLoaded.nextCursor,
    select: (data) => [...data.pages].reverse().flatMap((page) => page.items),
  });
}

/** Adds a message to the loaded ones, unless it is already there. */
function addMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<MessagePages>(chatKeys.messages(message.conversationId), (data) => {
    const [latest, ...older] = data?.pages ?? [];
    if (!data || !latest) return data;
    if (data.pages.some((page) => page.items.some((item) => item.id === message.id))) return data;
    return { ...data, pages: [{ ...latest, items: [...latest.items, message] }, ...older] };
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => getChatClient().messages.send(conversationId, body),
    onSuccess: (result) => {
      if (result.ok) addMessage(queryClient, result.message);
    },
  });
}

/**
 * While a conversation is open: shows new messages as they arrive, and marks the conversation
 * as read, both on opening it and whenever the team writes.
 */
export function useLiveConversation(conversationId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = getChatClient();
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    const markRead = () => {
      void client.conversations
        .markRead(conversationId)
        .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.conversations }))
        // Unread counts are a nicety. A failure here must not break the conversation.
        .catch(() => undefined);
    };

    markRead();
    void client.messages
      .subscribe(conversationId, (message) => {
        addMessage(queryClient, message);
        if (message.senderRole === "agent") markRead();
      })
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
          // Catch anything sent between loading the messages and starting to listen.
          void queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
        }
      })
      // Without live updates the conversation still works; messages show on the next load.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [conversationId, queryClient]);
}

/** Keeps the list of conversations fresh while it is on screen. */
export function useLiveConversationList(contactId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contactId) return undefined;
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getChatClient()
      .conversations.subscribe({ contactId }, () => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      })
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [contactId, queryClient]);
}

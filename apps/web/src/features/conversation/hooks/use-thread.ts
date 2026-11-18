import {
  type Attachment,
  type ConversationEvent,
  type Message,
  type Note,
  type Page,
} from "@helpwren/core";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
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
    mutationFn: ({ body, attachments }: { body: string; attachments: readonly Attachment[] }) =>
      getClient().messages.send(conversationId, body, attachments),
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

const notesKey = (conversationId: string) => ["conversation", "notes", conversationId];

function addNote(queryClient: QueryClient, note: Note) {
  queryClient.setQueryData<Note[]>(notesKey(note.conversationId), (notes = []) =>
    notes.some((item) => item.id === note.id) ? notes : [...notes, note],
  );
}

/**
 * A conversation's internal notes, kept current as teammates add them. Only ask for them on the
 * team's side: `enabled` is false in the visitor's chat, which could not read them anyway.
 */
export function useNotes(conversationId: string, enabled: boolean) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getClient()
      .notes.subscribe(conversationId, (note) => {
        addNote(queryClient, note);
      })
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      // Without live updates, a teammate's note shows on the next load.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [conversationId, enabled, getClient, queryClient]);

  return useQuery({
    queryKey: notesKey(conversationId),
    queryFn: () => getClient().notes.list(conversationId),
    enabled,
  });
}

export function useAddNote(conversationId: string) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => getClient().notes.add(conversationId, body),
    onSuccess: (note) => {
      addNote(queryClient, note);
    },
  });
}

const eventsKey = (conversationId: string) => ["conversation", "events", conversationId];

/**
 * What happened to a conversation besides its messages, kept current. `team` also asks for the
 * events only the team sees; pass it on the team's side only. `onEvent` is called as each new
 * one arrives, for anything else on screen that depends on it.
 */
export function useEvents(
  conversationId: string,
  team: boolean,
  onEvent?: (event: ConversationEvent) => void,
) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  // The latest callback, without restarting the subscription each time a parent re-renders.
  const latestOnEvent = useRef(onEvent);
  useEffect(() => {
    latestOnEvent.current = onEvent;
  });

  useEffect(() => {
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getClient()
      .events.subscribe(
        conversationId,
        (event) => {
          queryClient.setQueryData<ConversationEvent[]>(eventsKey(conversationId), (events = []) =>
            events.some((item) => item.id === event.id) ? events : [...events, event],
          );
          latestOnEvent.current?.(event);
        },
        { team },
      )
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      // Without live updates, the activity shows on the next load.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [conversationId, getClient, queryClient, team]);

  return useQuery({
    queryKey: eventsKey(conversationId),
    queryFn: () => getClient().events.list(conversationId),
  });
}

/**
 * Links to a message's files. The files are private and each link lasts an hour, so they are
 * asked for again well before that.
 */
export function useAttachmentUrls(attachments: readonly Attachment[]) {
  const getClient = useHelpwren();
  const paths = attachments.map((attachment) => attachment.path);
  return useQuery({
    queryKey: ["conversation", "attachment-urls", ...paths],
    queryFn: () => getClient().attachments.urls(paths),
    enabled: paths.length > 0,
    staleTime: 45 * 60_000,
    refetchInterval: 45 * 60_000,
  });
}

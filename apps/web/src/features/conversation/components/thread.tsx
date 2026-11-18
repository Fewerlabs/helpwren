"use client";

import { type Message } from "@helpwren/core";
import { Avatar, Button, EmptyState, MessageBubble, Skeleton } from "@helpwren/design-system";
import { useEffect, useRef } from "react";

import { formatMessageTime } from "@/lib/format-time";

import { useLiveThread, useMessages, useNotes } from "../hooks/use-thread";
import { Composer } from "./composer";

export interface ThreadProps {
  conversationId: string;
  /** Whether a message came from the person looking at the screen, or their side. */
  isOwn: (message: Message) => boolean;
  /** Shown above messages from the other side. */
  otherName: string;
  /** Called after the conversation has been marked as read, to refresh any unread counts. */
  onRead?: () => void;
  /**
   * `compact` is for the inbox: smaller bubbles and a roomier reply box. Default `comfortable`,
   * for the chat on a phone.
   */
  density?: "comfortable" | "compact";
  /**
   * Turns on internal notes, for the team's side: they are shown among the messages and can be
   * written from the reply box. The function names a note's author from their id.
   */
  noteAuthor?: (authorId: string) => string;
}

/**
 * One conversation: its messages, live, and the box for replying. Used by both sides, the
 * visitor's chat and the team's inbox. It fills the height it is given.
 */
export function Thread({
  conversationId,
  isOwn,
  otherName,
  onRead,
  density = "comfortable",
  noteAuthor,
}: ThreadProps) {
  const compact = density === "compact";
  const messages = useMessages(conversationId);
  const notes = useNotes(conversationId, noteAuthor !== undefined);
  useLiveThread(conversationId, { isOwn, onRead });

  const end = useRef<HTMLDivElement | null>(null);
  // Messages and notes together, in the order they were written.
  const entries = [
    ...(messages.data ?? []).map((message) => ({ kind: "message" as const, ...message })),
    ...(notes.data ?? []).map((note) => ({ kind: "note" as const, ...note })),
  ].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  const latestId = entries.at(-1)?.id;
  useEffect(() => {
    // Keep the newest message in view, on opening and as each one arrives.
    end.current?.scrollIntoView({ block: "end" });
  }, [latestId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.isPending ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading messages">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : messages.isError ? (
          <EmptyState
            scene={false}
            size="sm"
            title="The conversation could not be loaded."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void messages.refetch();
                }}
              >
                Try again
              </Button>
            }
          />
        ) : (
          <>
            {messages.hasNextPage ? (
              <div className="flex justify-center pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  loading={messages.isFetchingNextPage}
                  onClick={() => {
                    void messages.fetchNextPage();
                  }}
                >
                  Show earlier messages
                </Button>
              </div>
            ) : null}
            <div
              role="log"
              aria-label="Messages"
              className={compact ? "flex flex-col gap-2.5" : "flex flex-col gap-3"}
            >
              {entries.map((entry) =>
                entry.kind === "note" ? (
                  <MessageBubble
                    key={entry.id}
                    from="self"
                    note
                    size={compact ? "sm" : "md"}
                    time={formatMessageTime(entry.createdAt)}
                    footer={noteAuthor?.(entry.authorId)}
                    {...(compact ? { className: "max-w-[72%]" } : {})}
                  >
                    {entry.body}
                  </MessageBubble>
                ) : (
                  <MessageBubble
                    key={entry.id}
                    from={isOwn(entry) ? "self" : "other"}
                    size={compact ? "sm" : "md"}
                    {...(compact
                      ? {
                          className: "max-w-[72%]",
                          avatar: <Avatar name={otherName} size="sm" className="text-2xs size-6" />,
                        }
                      : {})}
                    author={otherName}
                    time={formatMessageTime(entry.createdAt)}
                  >
                    {entry.body}
                  </MessageBubble>
                ),
              )}
            </div>
          </>
        )}
        <div ref={end} />
      </div>
      <Composer
        conversationId={conversationId}
        variant={compact ? "card" : "bar"}
        allowNotes={noteAuthor !== undefined}
      />
    </div>
  );
}

"use client";

import { type Message } from "@helpwren/core";
import { Avatar, Button, EmptyState, MessageBubble, Skeleton } from "@helpwren/design-system";
import { useEffect, useRef } from "react";

import { formatMessageTime } from "@/lib/format-time";

import { describeEvent } from "../describe-event";
import { useEvents, useLiveThread, useMessages, useNotes } from "../hooks/use-thread";
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
   * Given on the team's side only. It names a person from their id, and turns on what only the
   * team has: internal notes among the messages and in the reply box, and who did what in the
   * activity. `null` is the system.
   */
  nameOf?: (id: string | null) => string;
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
  nameOf,
}: ThreadProps) {
  const compact = density === "compact";
  const messages = useMessages(conversationId);
  const forTeam = nameOf !== undefined;
  const notes = useNotes(conversationId, forTeam);
  const events = useEvents(conversationId, forTeam);
  useLiveThread(conversationId, { isOwn, onRead });

  const end = useRef<HTMLDivElement | null>(null);
  // Messages, notes and activity together, in the order they happened.
  const entries = [
    ...(messages.data ?? []).map((message) => ({ type: "message" as const, item: message })),
    ...(notes.data ?? []).map((note) => ({ type: "note" as const, item: note })),
    ...(events.data ?? []).map((event) => ({ type: "event" as const, item: event })),
  ].sort((first, second) => first.item.createdAt.localeCompare(second.item.createdAt));
  const latestId = entries.at(-1)?.item.id;
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
                entry.type === "event" ? (
                  <p
                    key={entry.item.id}
                    className="text-muted-foreground text-2xs self-center px-3 py-0.5 text-center"
                  >
                    {describeEvent(entry.item, nameOf)}
                    <span aria-hidden="true"> · </span>
                    {formatMessageTime(entry.item.createdAt)}
                  </p>
                ) : entry.type === "note" ? (
                  <MessageBubble
                    key={entry.item.id}
                    from="self"
                    note
                    size={compact ? "sm" : "md"}
                    time={formatMessageTime(entry.item.createdAt)}
                    footer={nameOf?.(entry.item.authorId)}
                    {...(compact ? { className: "max-w-[72%]" } : {})}
                  >
                    {entry.item.body}
                  </MessageBubble>
                ) : (
                  <MessageBubble
                    key={entry.item.id}
                    from={isOwn(entry.item) ? "self" : "other"}
                    size={compact ? "sm" : "md"}
                    {...(compact
                      ? {
                          className: "max-w-[72%]",
                          avatar: <Avatar name={otherName} size="sm" className="text-2xs size-6" />,
                        }
                      : {})}
                    author={otherName}
                    time={formatMessageTime(entry.item.createdAt)}
                  >
                    {entry.item.body}
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
        allowNotes={forTeam}
      />
    </div>
  );
}

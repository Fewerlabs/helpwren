"use client";

import { type Message } from "@helpwren/core";
import { Button, EmptyState, MessageBubble, Skeleton } from "@helpwren/design-system";
import { useEffect, useRef } from "react";

import { formatMessageTime } from "@/lib/format-time";

import { useLiveThread, useMessages } from "../hooks/use-thread";
import { Composer } from "./composer";

export interface ThreadProps {
  conversationId: string;
  /** Whether a message came from the person looking at the screen, or their side. */
  isOwn: (message: Message) => boolean;
  /** Shown above messages from the other side. */
  otherName: string;
  /** Called after the conversation has been marked as read, to refresh any unread counts. */
  onRead?: () => void;
}

/**
 * One conversation: its messages, live, and the box for replying. Used by both sides, the
 * visitor's chat and the team's inbox. It fills the height it is given.
 */
export function Thread({ conversationId, isOwn, otherName, onRead }: ThreadProps) {
  const messages = useMessages(conversationId);
  useLiveThread(conversationId, { isOwn, onRead });

  const end = useRef<HTMLDivElement | null>(null);
  const latestId = messages.data?.at(-1)?.id;
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
            <div role="log" aria-label="Messages" className="flex flex-col gap-3">
              {messages.data.map((message) => (
                <MessageBubble
                  key={message.id}
                  from={isOwn(message) ? "self" : "other"}
                  author={otherName}
                  time={formatMessageTime(message.createdAt)}
                >
                  {message.body}
                </MessageBubble>
              ))}
            </div>
          </>
        )}
        <div ref={end} />
      </div>
      <Composer conversationId={conversationId} />
    </div>
  );
}

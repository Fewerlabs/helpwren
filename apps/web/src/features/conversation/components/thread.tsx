"use client";

import {
  type Message,
  type PlaceholderValues,
  type TypingSender,
  type Typist,
} from "@helpwren/core";
import {
  Avatar,
  Button,
  cn,
  EmptyState,
  Icon,
  MessageBubble,
  Skeleton,
  TypingIndicator,
} from "@helpwren/design-system";
import { useEffect, useRef, type ReactNode } from "react";

import { formatMessageTime } from "@/lib/format-time";

import { describeEvent } from "../describe-event";
import { useEvents, useLiveThread, useMessages, useNotes } from "../hooks/use-thread";
import { useTyping } from "../hooks/use-typing";
import { Composer } from "./composer";
import { MessageAttachments } from "./message-attachments";

// In the inbox a bubble stays short of the full width, so the two sides read apart. A phone has
// little width to give away, so there it may run wider.
const COMPACT_WIDTH = "max-w-[72%] max-md:max-w-[85%]";

/** Marks a message the contact sent by replying to an email. */
function ViaEmail() {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name="envelope" />
      via email
    </span>
  );
}

export interface ThreadProps {
  conversationId: string;
  /** Whether a message came from the person looking at the screen, or their side. */
  isOwn: (message: Message) => boolean;
  /** Shown above messages from the other side. */
  otherName: string;
  /** A picture for the other side, such as a brand's logo, in place of their initials. */
  otherAvatar?: string | undefined;
  /**
   * Called when something about the conversation has changed that may show elsewhere on screen:
   * it was marked as read, or an event such as a rating arrived.
   */
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
  /** Shown between the messages and the reply box, such as a request to rate the conversation. */
  beforeComposer?: ReactNode;
  /** How the person here shows up to the other side while typing: the team gives a name. */
  typingAs?: TypingSender | undefined;
  /**
   * Which of the people typing to show in the thread, and as whom. Left out, everyone typing is
   * the other side, shown by the name and photo they sent, or `otherName`. Return `null` to
   * leave someone out, such as a teammate, who shows in the inbox's header instead.
   */
  showTypist?:
    ((typist: Typist) => { name: string; avatar?: string | undefined } | null) | undefined;
  /** Turns on saved replies in the reply box, filled with these. Team side only. */
  placeholders?: PlaceholderValues | undefined;
}

/**
 * One conversation: its messages, live, and the box for replying. Used by both sides, the
 * visitor's chat and the team's inbox. It fills the height it is given.
 */
export function Thread({
  conversationId,
  isOwn,
  otherName,
  otherAvatar,
  onRead,
  density = "comfortable",
  nameOf,
  beforeComposer,
  typingAs,
  showTypist,
  placeholders,
}: ThreadProps) {
  const compact = density === "compact";
  const typing = useTyping(conversationId, typingAs);
  const typists = typing.typists.flatMap((typist) => {
    const shown = showTypist
      ? showTypist(typist)
      : { name: typist.name ?? otherName, avatar: typist.avatar ?? otherAvatar };
    return shown ? [shown] : [];
  });
  const [firstTypist] = typists;
  const messages = useMessages(conversationId);
  const forTeam = nameOf !== undefined;
  const notes = useNotes(conversationId, forTeam);
  // A change to the conversation, such as a rating, may show elsewhere on screen too.
  const events = useEvents(conversationId, forTeam, onRead);
  useLiveThread(conversationId, { isOwn, onRead });

  const end = useRef<HTMLDivElement | null>(null);
  // Messages, notes and activity together, in the order they happened.
  const entries = [
    ...(messages.data ?? []).map((message) => ({ type: "message" as const, item: message })),
    ...(notes.data ?? []).map((note) => ({ type: "note" as const, item: note })),
    ...(events.data ?? []).map((event) => ({ type: "event" as const, item: event })),
  ].sort((first, second) => first.item.createdAt.localeCompare(second.item.createdAt));
  const latestId = entries.at(-1)?.item.id;
  const someoneTyping = typists.length > 0;
  useEffect(() => {
    // Keep the newest message in view, on opening, as each one arrives, and when someone
    // starts typing below it.
    end.current?.scrollIntoView({ block: "end" });
  }, [latestId, someoneTyping]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* In the inbox on a phone the thread keeps a narrow margin, so the messages get the width. */}
      <div
        className={cn("min-h-0 flex-1 overflow-y-auto p-4", compact && "max-md:px-3 max-md:py-3")}
      >
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
                    {...(compact ? { className: COMPACT_WIDTH } : {})}
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
                          className: COMPACT_WIDTH,
                          avatar: (
                            <Avatar
                              name={otherName}
                              src={otherAvatar}
                              size="sm"
                              // A logo is a finished shape of its own, so it gets no ring.
                              className={cn(
                                "text-2xs size-6",
                                otherAvatar && "bg-transparent after:hidden",
                              )}
                            />
                          ),
                        }
                      : {})}
                    author={otherName}
                    time={formatMessageTime(entry.item.createdAt)}
                    {...(entry.item.channel === "email" ? { footer: <ViaEmail /> } : {})}
                    {...(entry.item.attachments.length > 0
                      ? {
                          attachments: (
                            <MessageAttachments
                              attachments={entry.item.attachments}
                              compact={compact}
                            />
                          ),
                        }
                      : {})}
                  >
                    {entry.item.body}
                  </MessageBubble>
                ),
              )}
            </div>
          </>
        )}
        <TypingIndicator
          names={typists.map((typist) => typist.name)}
          size={compact ? "sm" : "md"}
          className={someoneTyping ? (compact ? "pt-2.5" : "pt-3") : undefined}
          avatar={
            firstTypist ? (
              <Avatar
                name={firstTypist.name}
                src={firstTypist.avatar}
                size="sm"
                className="text-2xs size-6 shrink-0"
              />
            ) : null
          }
        />
        <div ref={end} />
      </div>
      {beforeComposer}
      <Composer
        conversationId={conversationId}
        variant={compact ? "card" : "bar"}
        allowNotes={forTeam}
        typing={typing}
        placeholders={placeholders}
      />
    </div>
  );
}

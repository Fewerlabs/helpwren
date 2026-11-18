"use client";

import { type ConversationWithContact } from "@helpwren/core";

import { formatTimeAgo } from "@/lib/format-time";

import { TeamAvatar } from "../brand";

export interface ConversationRowProps {
  conversation: ConversationWithContact;
  /** Shown as the other side of the conversation. */
  onOpen: () => void;
}

/** One of the visitor's conversations in a list: its latest message, and a dot if it is unread. */
export function ConversationRow({ conversation, onOpen }: ConversationRowProps) {
  const unread = conversation.unreadForContact > 0;

  return (
    <button
      type="button"
      className="hover:bg-muted focus-visible:outline-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2"
      onClick={onOpen}
    >
      <TeamAvatar size="sm" />
      <span className={unread ? "min-w-0 flex-1 text-sm font-medium" : "min-w-0 flex-1 text-sm"}>
        {conversation.type === "ticket" ? (
          <span className="text-muted-foreground block truncate text-xs font-normal">
            Ticket #{conversation.ticketNumber}
            {conversation.subject ? ` · ${conversation.subject}` : null}
          </span>
        ) : null}
        <span className="line-clamp-2">{conversation.lastMessagePreview}</span>
      </span>
      {unread ? (
        <span className="text-xs">
          <span aria-hidden="true" className="bg-primary block size-2 rounded-full" />
          <span className="sr-only">{conversation.unreadForContact} unread</span>
        </span>
      ) : conversation.lastMessageAt ? (
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatTimeAgo(conversation.lastMessageAt)}
        </span>
      ) : null}
    </button>
  );
}

"use client";

import { type ConversationWithContact } from "@helpwren/core";
import { Button, ConversationListItem } from "@helpwren/design-system";

import { formatMessageTime } from "../format";
import { useShowScreen } from "../store/chat-store";

export interface ConversationListProps {
  conversations: readonly ConversationWithContact[];
  /** Shown as the other side of each conversation. */
  teamName: string;
}

/** The visitor's earlier conversations, and a way to start another. */
export function ConversationList({ conversations, teamName }: ConversationListProps) {
  const show = useShowScreen();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul aria-label="Your conversations" className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationListItem
              name={teamName}
              preview={conversation.lastMessagePreview ?? ""}
              time={
                conversation.lastMessageAt
                  ? formatMessageTime(conversation.lastMessageAt)
                  : undefined
              }
              unread={conversation.unreadForContact}
              onClick={() => {
                show({ name: "conversation", id: conversation.id });
              }}
            />
          </li>
        ))}
      </ul>
      <div className="border-rule border-t p-3">
        <Button
          className="w-full"
          onClick={() => {
            show({ name: "start" });
          }}
        >
          New conversation
        </Button>
      </div>
    </div>
  );
}

"use client";

import { type ConversationWithContact } from "@helpwren/core";
import { Button, EmptyState, Icon } from "@helpwren/design-system";

import { isToday } from "@/lib/format-time";

import { useShowScreen } from "../store/chat-store";
import { ConversationRow } from "./conversation-row";
import { ScreenHeader } from "./screen-header";

export interface MessagesScreenProps {
  conversations: readonly ConversationWithContact[];
  teamName: string;
}

/** The Messages tab: the visitor's conversations, today's first, and a way to start another. */
export function MessagesScreen({ conversations, teamName }: MessagesScreenProps) {
  const show = useShowScreen();
  const groups = [
    {
      label: "Today",
      items: conversations.filter((item) => item.lastMessageAt && isToday(item.lastMessageAt)),
    },
    {
      label: "Earlier",
      items: conversations.filter((item) => !item.lastMessageAt || !isToday(item.lastMessageAt)),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="Messages" />
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-20">
        {groups.length === 0 ? (
          <EmptyState
            scene="conversations"
            size="sm"
            className="pt-10"
            title="No messages yet"
            description={`When you write to ${teamName}, the conversation appears here.`}
          />
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="pb-3">
              <h2 className="text-muted-foreground px-4 pt-2 pb-1 text-xs">{group.label}</h2>
              <ul>
                {group.items.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationRow
                      conversation={conversation}
                      teamName={teamName}
                      onOpen={() => {
                        show({ name: "conversation", id: conversation.id });
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <Button
          className="pointer-events-auto rounded-full px-5 shadow-none"
          onClick={() => {
            show({ name: "start" });
          }}
        >
          Send us a message
          <Icon name="paper-plane-tilt" />
        </Button>
      </div>
    </div>
  );
}

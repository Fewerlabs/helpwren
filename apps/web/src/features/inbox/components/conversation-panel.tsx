"use client";

import { type ConversationWithContact, type Message } from "@helpwren/core";
import { Avatar, Button, Icon, StatusChip, type StatusName } from "@helpwren/design-system";

import { Thread } from "@/features/conversation";
import { Panel, PanelHeader } from "@/features/dashboard";

import { contactName } from "../contact-name";

const chipFor = {
  open: "open",
  pending: "waiting",
  resolved: "resolved",
  closed: "closed",
} as const satisfies Record<ConversationWithContact["status"], StatusName>;

// On the team's side, a message from any team member is "ours".
const isFromTeam = (message: Message) => message.senderRole === "agent";

export interface ConversationPanelProps {
  conversation: ConversationWithContact;
  /** Returns to the list. Shown only where the list and conversation do not fit side by side. */
  onBack: () => void;
  onRead: () => void;
  className?: string;
}

/** The middle panel: the open conversation and the reply box. */
export function ConversationPanel({
  conversation,
  onBack,
  onRead,
  className,
}: ConversationPanelProps) {
  const name = contactName(conversation.contact);

  return (
    <Panel aria-label={`Conversation with ${name}`} className={className}>
      <PanelHeader>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to the inbox"
          className="md:hidden"
          onClick={onBack}
        >
          <Icon name="caret-left" />
        </Button>
        <Avatar name={name} size="sm" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</h2>
        <StatusChip status={chipFor[conversation.status]} size="sm" />
      </PanelHeader>
      <Thread
        key={conversation.id}
        conversationId={conversation.id}
        isOwn={isFromTeam}
        otherName={name}
        onRead={onRead}
      />
    </Panel>
  );
}

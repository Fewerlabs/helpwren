"use client";

import { type ConversationWithContact, type Message, type TeamMember } from "@helpwren/core";
import { Avatar, Button, Icon, StatusChip, Tooltip } from "@helpwren/design-system";
import { useCallback, useState } from "react";

import { Thread } from "@/features/conversation";
import { Panel, PanelHeader } from "@/features/dashboard";

import { contactName } from "../contact-name";
import { useChangeConversation } from "../hooks/use-inbox";
import { statuses, ticketLabel } from "../labels";
import { TicketDialog } from "./ticket-dialog";

// On the team's side, a message from any team member is "ours".
const isFromTeam = (message: Message) => message.senderRole === "agent";

export interface ConversationPanelProps {
  conversation: ConversationWithContact;
  team: readonly TeamMember[];
  /** The signed-in team member, for "Assign to me". */
  agentId: string;
  /** Shows the back button at every width, for a view with no list beside the conversation. */
  backAlways?: boolean;
  /** Returns to the list. Shown only where the list and conversation do not fit side by side. */
  onBack: () => void;
  onRead: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  className?: string;
}

/** The main panel: the open conversation, what can be done with it, and the reply box. */
export function ConversationPanel({
  conversation,
  team,
  agentId,
  backAlways = false,
  onBack,
  onRead,
  detailsOpen,
  onToggleDetails,
  className,
}: ConversationPanelProps) {
  const name = contactName(conversation.contact);
  const change = useChangeConversation(conversation.id);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const isTicket = conversation.type === "ticket";
  const done = conversation.status === "resolved" || conversation.status === "closed";

  // Names for notes and activity: a team member, the contact, or the system.
  const contactId = conversation.contactId;
  const nameOf = useCallback(
    (id: string | null) =>
      id === null
        ? "The system"
        : id === contactId
          ? name
          : (team.find((member) => member.id === id)?.name ?? "A team member"),
    [contactId, name, team],
  );

  return (
    <Panel aria-label={`Conversation with ${name}`} className={className}>
      <PanelHeader>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to the list"
          className={backAlways ? undefined : "md:hidden"}
          onClick={onBack}
        >
          <Icon name="caret-left" />
        </Button>
        <Avatar name={name} size="sm" className="text-2xs size-6" />
        <h2 className="flex min-w-0 items-baseline gap-2 font-semibold">
          {isTicket ? (
            <span className="text-muted-foreground shrink-0 font-mono text-xs font-normal">
              {ticketLabel(conversation)}
            </span>
          ) : null}
          <span className="truncate">{isTicket ? (conversation.subject ?? name) : name}</span>
        </h2>
        <StatusChip status={statuses[conversation.status].chip} size="sm" />
        <span className="flex-1" />
        {isTicket ? null : (
          <Tooltip content="Convert to ticket">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Convert to ticket"
              onClick={() => {
                setTicketDialogOpen(true);
              }}
            >
              <Icon name="ticket" />
            </Button>
          </Tooltip>
        )}
        {conversation.assigneeId === agentId ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              change.mutate({ assigneeId: agentId });
            }}
          >
            {/* On a phone the header has room for icons only; the words are still read out. */}
            <Icon name="user" className="md:hidden" />
            <span className="max-md:sr-only">Assign to me</span>
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          loading={change.isPending}
          onClick={() => {
            change.mutate({ status: done ? "open" : "resolved" });
          }}
        >
          <Icon
            name={done ? "arrows-clockwise" : "check-circle"}
            className={done ? "md:hidden" : undefined}
          />
          <span className="max-md:sr-only">{done ? "Reopen" : "Resolve"}</span>
        </Button>
        <Tooltip content={detailsOpen ? "Hide details" : "Show details"}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Details"
            aria-pressed={detailsOpen}
            onClick={onToggleDetails}
          >
            <Icon name="sidebar-simple" mirrored weight={detailsOpen ? "duotone" : "regular"} />
          </Button>
        </Tooltip>
      </PanelHeader>
      <Thread
        key={conversation.id}
        conversationId={conversation.id}
        isOwn={isFromTeam}
        otherName={name}
        onRead={onRead}
        density="compact"
        nameOf={nameOf}
      />
      <TicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        onConvert={async (subject) => {
          const result = await change.mutateAsync({ ticketSubject: subject });
          if (!result.ok) throw new Error("The conversation could not be found.");
        }}
      />
    </Panel>
  );
}

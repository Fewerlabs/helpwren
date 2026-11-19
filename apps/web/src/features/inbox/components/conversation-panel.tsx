"use client";

import { type ConversationWithContact, type Message, type TeamMember } from "@helpwren/core";
import {
  ActionButton,
  Avatar,
  Button,
  cn,
  Icon,
  StatusChip,
  Tooltip,
} from "@helpwren/design-system";
import { useCallback, useMemo, useState } from "react";

import { Thread } from "@/features/conversation";
import { Panel, PanelHeader } from "@/features/dashboard";

import { contactName } from "../contact-name";
import { useConfirmStatus } from "../hooks/use-confirm-status";
import { useChangeConversation } from "../hooks/use-inbox";
import { statuses, ticketLabel } from "../labels";
import { ConversationPresence } from "./conversation-presence";
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
  const confirmStatus = useConfirmStatus();
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

  // Who is writing, for the customer's "Ada is typing…", and what saved replies are filled with.
  const me = team.find((member) => member.id === agentId);
  const typingAs = useMemo(() => ({ name: me?.name, avatar: me?.photo }), [me?.name, me?.photo]);
  const { email } = conversation.contact;
  const contactNameGiven = conversation.contact.name;
  const ticketNumber = conversation.ticketNumber;
  const placeholders = useMemo(
    () => ({
      contact: { name: contactNameGiven, email },
      agent: { name: me?.name },
      conversation: { number: ticketNumber },
    }),
    [contactNameGiven, email, me?.name, ticketNumber],
  );
  // Only the contact shows typing in the thread; a teammate shows in the strip under the header.
  const showTypist = useCallback(
    (typist: { userId: string }) => (typist.userId === contactId ? { name } : null),
    [contactId, name],
  );

  return (
    <Panel aria-label={`Conversation with ${name}`} className={className}>
      <PanelHeader>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to the list"
          className={cn("max-md:size-10", !backAlways && "md:hidden")}
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
        <StatusChip status={statuses[conversation.status].chip} size="sm" className="shrink-0" />
        <span className="flex-1" />
        {/* On a phone these are one set of 40px icon buttons, alike in size and weight, so none
            reads as more pressing than the others; the words come back from md up. */}
        <div className="flex shrink-0 items-center gap-1">
          {isTicket ? null : (
            <Tooltip content="Convert to ticket">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Convert to ticket"
                className="max-md:size-10"
                onClick={() => {
                  setTicketDialogOpen(true);
                }}
              >
                <Icon name="ticket" />
              </Button>
            </Tooltip>
          )}
          {conversation.assigneeId === agentId ? null : (
            <ActionButton
              variant="ghost"
              icon="user"
              label="Assign to me"
              collapseBelow="md"
              onClick={() => {
                change.mutate({ assigneeId: agentId });
              }}
            />
          )}
          <ActionButton
            variant="secondary"
            icon={done ? "arrows-clockwise" : "check-circle"}
            label={done ? "Reopen" : "Resolve"}
            collapseBelow="md"
            // Outlined beside the text buttons on a wide screen; on a phone an icon like the rest.
            className="max-md:border-transparent max-md:bg-transparent"
            loading={change.isPending}
            onClick={() => {
              if (done) {
                change.mutate({ status: "open" });
                return;
              }
              void confirmStatus("resolved", conversation).then((confirmed) => {
                if (confirmed) change.mutate({ status: "resolved" });
              });
            }}
          />
          <Tooltip content={detailsOpen ? "Hide details" : "Show details"}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Details"
              aria-pressed={detailsOpen}
              className="max-md:size-10"
              onClick={onToggleDetails}
            >
              <Icon
                name="sidebar-simple"
                mirrored
                weight={detailsOpen ? "duotone" : "regular"}
                className={detailsOpen ? "text-primary" : undefined}
              />
            </Button>
          </Tooltip>
        </div>
      </PanelHeader>
      <ConversationPresence
        conversationId={conversation.id}
        contactId={contactId}
        agentId={agentId}
        team={team}
      />
      <Thread
        key={conversation.id}
        conversationId={conversation.id}
        isOwn={isFromTeam}
        otherName={name}
        onRead={onRead}
        density="compact"
        nameOf={nameOf}
        typingAs={typingAs}
        showTypist={showTypist}
        placeholders={placeholders}
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

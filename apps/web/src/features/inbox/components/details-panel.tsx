"use client";

import {
  RATING_MAX,
  type ConversationChanges,
  type ConversationPriority,
  type ConversationStatus,
  type ConversationWithContact,
  type TeamMember,
} from "@helpwren/core";
import { Avatar, Badge, Expandable, Icon, Link, type IconName } from "@helpwren/design-system";
import { useId, useState, type ReactNode } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";

import { contactName } from "../contact-name";
import { useRating } from "../hooks/use-inbox";
import { priorities, statuses, ticketLabel } from "../labels";
import { NOBODY, Picker } from "./picker";

const startedFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

interface SectionProps {
  title: string;
  icon: IconName;
  children: ReactNode;
}

/** A group of details that can be folded away, so the panel stays short as more are added. */
function Section({ title, icon, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  const contentId = useId();

  return (
    <section className="border-rule border-b last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          className="hover:bg-muted/60 focus-visible:outline-ring text-muted-foreground text-2xs flex w-full items-center gap-2 px-3 py-2.5 text-left font-mono tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          <Icon name={icon} className="size-3.5" />
          <span className="flex-1">{title}</span>
          <Icon
            name="caret-down"
            className={
              open
                ? "text-muted-foreground size-3 rotate-180 transition-transform"
                : "text-muted-foreground size-3 transition-transform"
            }
          />
        </button>
      </h3>
      <Expandable open={open} id={contentId}>
        <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 pb-3 text-xs">
          {children}
        </dl>
      </Expandable>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

const missing = <span className="text-muted-foreground">Not given</span>;

/** A page address without its scheme, which is how people read one. */
function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export interface DetailsPanelProps {
  conversation: ConversationWithContact;
  team: readonly TeamMember[];
  onChange: (changes: ConversationChanges) => void;
  className?: string;
}

/** The side panel: who has the conversation and where it stands, then who it is with. */
export function DetailsPanel({ conversation, team, onChange, className }: DetailsPanelProps) {
  const { contact, context } = conversation;
  const name = contactName(contact);
  const page = typeof context.url === "string" ? context.url : undefined;
  const pageTitle = typeof context.title === "string" ? context.title : undefined;
  const isTicket = conversation.type === "ticket";
  const rating = useRating(conversation.id).data;

  // Someone who was deactivated while holding a conversation still shows as its assignee.
  const assignees = team.filter((member) => member.active || member.id === conversation.assigneeId);

  return (
    <Panel aria-label="Details" className={className}>
      <PanelHeader>
        <h2 className="font-semibold">Details</h2>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-rule flex items-center gap-3 border-b px-3 py-3.5">
          <Avatar name={name} />
          <div className="grid min-w-0 gap-1">
            <p className="truncate font-semibold">{name}</p>
            <div>
              {contact.kind === "guest" ? (
                <Badge variant="outline">Guest</Badge>
              ) : contact.verified ? (
                <Badge variant="accent">Verified user</Badge>
              ) : (
                <Badge variant="outline">Unverified user</Badge>
              )}
            </div>
          </div>
        </div>
        <Section
          title={isTicket ? "Ticket" : "Conversation"}
          icon={isTicket ? "ticket" : "chat-circle"}
        >
          {isTicket ? (
            <Row label="Number">
              <span className="font-mono">{ticketLabel(conversation)}</span>
            </Row>
          ) : null}
          <Row label="Assignee">
            <Picker
              label="Assignee"
              value={conversation.assigneeId ?? NOBODY}
              options={[
                { value: NOBODY, label: "Unassigned" },
                ...assignees.map((member) => ({ value: member.id, label: member.name })),
              ]}
              onChange={(value) => {
                onChange({ assigneeId: value === NOBODY ? null : value });
              }}
            />
          </Row>
          <Row label="Status">
            <Picker
              label="Status"
              value={conversation.status}
              options={Object.entries(statuses).map(([value, status]) => ({
                value,
                label: status.label,
              }))}
              onChange={(value) => {
                onChange({ status: value as ConversationStatus });
              }}
            />
          </Row>
          <Row label="Priority">
            <Picker
              label="Priority"
              value={conversation.priority}
              options={Object.entries(priorities).map(([value, label]) => ({ value, label }))}
              onChange={(value) => {
                onChange({ priority: value as ConversationPriority });
              }}
            />
          </Row>
          {rating ? (
            <Row label="Rating">
              <span className="font-medium tabular-nums">
                {rating.score} out of {RATING_MAX}
              </span>
              {rating.comment ? (
                <span className="text-muted-foreground block pt-0.5">“{rating.comment}”</span>
              ) : null}
            </Row>
          ) : null}
          <Row label="Started">{startedFormat.format(new Date(conversation.createdAt))}</Row>
          <Row label="Source">
            <span className="font-mono">{conversation.source}</span>
          </Row>
          <Row label="Page">
            {page ? (
              <Link href={page} external>
                {pageTitle ?? shortUrl(page)}
              </Link>
            ) : (
              <span className="text-muted-foreground">Unknown</span>
            )}
          </Row>
        </Section>
        <Section title="Contact" icon="user">
          <Row label="Name">{contact.name ?? missing}</Row>
          <Row label="Email">
            {contact.email ? (
              <Link href={`mailto:${contact.email}`}>{contact.email}</Link>
            ) : (
              missing
            )}
          </Row>
          <Row label="Phone">
            {contact.phone ? <Link href={`tel:${contact.phone}`}>{contact.phone}</Link> : missing}
          </Row>
        </Section>
      </div>
    </Panel>
  );
}

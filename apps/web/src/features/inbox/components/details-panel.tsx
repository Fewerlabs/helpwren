"use client";

import {
  conversationHelpSchema,
  describeArticleFilter,
  pageContextSchema,
  RATING_MAX,
  type ConversationChanges,
  type ConversationPriority,
  type ConversationStatus,
  type ConversationWithContact,
  type Team,
  type TeamMember,
} from "@helpwren/core";
import {
  Avatar,
  Badge,
  Expandable,
  Icon,
  InlineSelect,
  Link,
  StatusChip,
  type IconName,
} from "@helpwren/design-system";
import { useId, useState, type ReactNode } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";
import { ContactVisitor } from "@/features/visitors";

import { contactName } from "../contact-name";
import { useConfirmStatus } from "../hooks/use-confirm-status";
import { useRating } from "../hooks/use-inbox";
import { statuses, ticketLabel } from "../labels";
import {
  assigneeOptions,
  noTeam,
  TeamName,
  teamOptions,
  NOBODY,
  Person,
  priorityOptions,
  statusOptions,
  unassigned,
} from "../options";
import { PriorityLabel } from "./priority-label";

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
  /** The children draw their own list, in place of label and value rows. */
  bare?: boolean;
}

/** A group of details that can be folded away, so the panel stays short as more are added. */
function Section({ title, icon, children, bare = false }: SectionProps) {
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
        {bare ? (
          <div className="px-3 pb-3">{children}</div>
        ) : (
          <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 pb-3 text-xs">
            {children}
          </dl>
        )}
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
  /** The install's teams, for giving the conversation to one. */
  teams: readonly Team[];
  onChange: (changes: ConversationChanges) => void;
  className?: string;
}

/** The side panel: who has the conversation and where it stands, then who it is with. */
export function DetailsPanel({
  conversation,
  team,
  teams,
  onChange,
  className,
}: DetailsPanelProps) {
  const { contact, context } = conversation;
  const name = contactName(contact);
  // The page the visitor wrote from is their browser's word, so it is a link only when it is a
  // web address: older conversations were stored before the server checked.
  const page =
    typeof context.url === "string" && /^https?:\/\//i.test(context.url) ? context.url : undefined;
  const pageTitle = typeof context.title === "string" ? context.title : undefined;
  const fromPage = Object.entries(pageContextSchema.safeParse(context.custom).data ?? {});
  // The help the chat listed for the page when the conversation started.
  const help = conversationHelpSchema.safeParse(context.help).data;
  const isTicket = conversation.type === "ticket";
  const rating = useRating(conversation.id).data;
  const confirmStatus = useConfirmStatus();

  const assignees = assigneeOptions(team);
  const assignee = team.find((member) => member.id === conversation.assigneeId);
  const ownTeam = teams.find((item) => item.id === conversation.teamId);

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
            <InlineSelect
              label="Assignee"
              value={conversation.assigneeId ?? NOBODY}
              options={assignees}
              onValueChange={(value) => {
                onChange({ assigneeId: value === NOBODY ? null : value });
              }}
            >
              {assignee ? <Person name={assignee.name} photo={assignee.photo} /> : unassigned}
            </InlineSelect>
          </Row>
          {/* Only once there are teams: with none, the row would offer nothing to choose. */}
          {teams.length > 0 ? (
            <Row label="Team">
              <InlineSelect
                label="Team"
                value={conversation.teamId ?? NOBODY}
                options={teamOptions(teams)}
                onValueChange={(value) => {
                  onChange({ teamId: value === NOBODY ? null : value });
                }}
              >
                {ownTeam ? <TeamName name={ownTeam.name} /> : noTeam}
              </InlineSelect>
            </Row>
          ) : null}
          <Row label="Status">
            <InlineSelect
              label="Status"
              value={conversation.status}
              options={statusOptions}
              onValueChange={(value) => {
                const status = value as ConversationStatus;
                void confirmStatus(status, conversation).then((confirmed) => {
                  if (confirmed) onChange({ status });
                });
              }}
            >
              <StatusChip status={statuses[conversation.status].chip} size="sm" />
            </InlineSelect>
          </Row>
          <Row label="Priority">
            <InlineSelect
              label="Priority"
              value={conversation.priority}
              options={priorityOptions}
              onValueChange={(value) => {
                onChange({ priority: value as ConversationPriority });
              }}
            >
              <PriorityLabel priority={conversation.priority} />
            </InlineSelect>
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
          <Row label="Channel">
            <span className="font-mono">{conversation.source}</span>
            {conversation.viaEmail ? (
              <span className="text-muted-foreground block pt-0.5">Also replied by email</span>
            ) : null}
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
        {fromPage.length > 0 ? (
          // What the site said with `setContext`. It is the page's word, not something checked.
          <Section title="From the page" icon="code">
            {fromPage.map(([key, value]) => (
              <Row key={key} label={key}>
                {String(value)}
              </Row>
            ))}
          </Section>
        ) : null}
        {help ? (
          <Section title="Help for this page" icon="lifebuoy">
            {help.match?.kind === "rule" ? (
              <Row label="Rule">{help.match.name ?? "A rule since removed"}</Row>
            ) : null}
            {help.match?.kind === "filter" ? (
              <Row label="Filter">
                <span className="text-muted-foreground block pb-0.5">Set by the page</span>
                {describeArticleFilter(help.match.filter).join(" · ")}
              </Row>
            ) : null}
            {help.fallback ? <Row label="Search">“{help.fallback}”</Row> : null}
          </Section>
        ) : null}
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
        <ContactVisitor
          contactId={contact.id}
          factsClassName="grid-cols-[4.5rem_minmax(0,1fr)]"
          frame={(content) => (
            <Section title="Visitor" icon="globe" bare>
              {content}
            </Section>
          )}
        />
      </div>
    </Panel>
  );
}

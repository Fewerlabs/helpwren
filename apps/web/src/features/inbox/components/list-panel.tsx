"use client";

import { type ConversationWithContact, type TeamMember } from "@helpwren/core";
import {
  Avatar,
  cn,
  EmptyState,
  Icon,
  QueryList,
  SearchField,
  StatusChip,
  Tooltip,
} from "@helpwren/design-system";
import { useIsFetching } from "@tanstack/react-query";

import { Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";

import { contactName } from "../contact-name";
import { INBOX_QUERY_KEY, type InboxView } from "../hooks/use-inbox";
import { statuses, ticketLabel } from "../labels";

/** How many conversations each request brings; scrolling to the end brings the next. */
const PAGE_SIZE = 30;

interface RowProps {
  conversation: ConversationWithContact;
  /** Whoever it is assigned to, if anyone. */
  assignee: TeamMember | undefined;
  selected: boolean;
  showStatus: boolean;
  onSelect: () => void;
}

/** One conversation in the list. Unread ones are heavier, so they stand out when scanning. */
function Row({ conversation, assignee, selected, showStatus, onSelect }: RowProps) {
  const name = contactName(conversation.contact);
  const unread = conversation.unreadForAgents;

  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      className={cn(
        "focus-visible:outline-ring flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-2",
        selected ? "bg-muted" : "hover:bg-muted/60",
      )}
      onClick={onSelect}
    >
      <Avatar name={name} size="sm" className="text-2xs mt-0.5 size-7" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn("truncate", unread > 0 ? "font-semibold" : "font-medium")}>
              {name}
            </span>
            {conversation.priority === "high" ? (
              <Icon
                name="warning-circle"
                weight="fill"
                label="High priority"
                className="text-destructive size-3.5"
              />
            ) : null}
          </span>
          {conversation.lastMessageAt ? (
            <span className="text-muted-foreground text-2xs shrink-0 tabular-nums">
              {formatTimeAgo(conversation.lastMessageAt)}
            </span>
          ) : null}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-xs",
              unread > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {conversation.type === "ticket" ? (
              <span className="text-muted-foreground mr-1.5 font-mono">
                {ticketLabel(conversation)}
              </span>
            ) : null}
            {conversation.type === "ticket" && conversation.subject
              ? conversation.subject
              : conversation.lastMessagePreview}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {showStatus ? (
              <StatusChip status={statuses[conversation.status].chip} size="sm" />
            ) : null}
            {assignee ? (
              <Tooltip content={`Assigned to ${assignee.name}`}>
                <Avatar
                  name={assignee.name}
                  src={assignee.photo}
                  size="sm"
                  className="size-4 text-[0.5rem]"
                />
              </Tooltip>
            ) : null}
            {unread > 0 ? (
              <span className="bg-primary text-primary-foreground text-2xs grid h-4 min-w-4 place-items-center rounded-full px-1 font-medium">
                {unread}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}

export interface ListPanelProps {
  view: InboxView;
  /** The signed-in team member, for the view of what is assigned to them. */
  agentId: string;
  team: readonly TeamMember[];
  /** How many conversations the view holds, once that is known. */
  count: number | undefined;
  /** What is typed in the search box. */
  search: string;
  onSearchChange: (search: string) => void;
  /** The text to search for, once typing has paused. Empty shows the view. */
  searchText: string;
  selectedId: string | null;
  onSelect: (conversation: ConversationWithContact) => void;
  className?: string;
}

/** The left panel: a view's conversations, or what a search found, most recently active first. */
export function ListPanel({
  view,
  agentId,
  team,
  count,
  search,
  onSearchChange,
  searchText,
  selectedId,
  onSelect,
  className,
}: ListPanelProps) {
  const getClient = useHelpwren();
  const searching = searchText !== "";
  const fetching = useIsFetching({ queryKey: [...INBOX_QUERY_KEY, "list"] }) > 0;

  return (
    <Panel aria-label="Conversations" className={className}>
      <PanelHeader>
        <h2 className="flex items-baseline gap-1.5 font-semibold">
          {searching ? "Results" : view.label}
          {!searching && count !== undefined ? (
            <span className="text-muted-foreground text-xs font-normal tabular-nums">{count}</span>
          ) : null}
        </h2>
      </PanelHeader>
      <div className="px-2 pt-2">
        <SearchField
          aria-label="Search conversations"
          placeholder="Search conversations"
          // Quieter than a form field: it sits above a list, so it is a tint with no edge.
          className="bg-muted dark:bg-muted min-h-8 border-transparent"
          value={search}
          onValueChange={onSearchChange}
          loading={searching && fetching}
        />
      </div>

      <QueryList<ConversationWithContact, string>
        aria-label="Conversations"
        // Under the inbox's key, so a change or a new message refreshes it with everything else.
        queryKey={[...INBOX_QUERY_KEY, "list", view.id, agentId, searchText]}
        queryFn={async ({ cursor, pageSize }) =>
          searching
            ? { items: await getClient().conversations.search(searchText) }
            : getClient().conversations.list({ ...view.filter(agentId), cursor, limit: pageSize })
        }
        pageSize={PAGE_SIZE}
        getItemKey={(conversation) => conversation.id}
        renderItem={(conversation) => (
          <Row
            conversation={conversation}
            assignee={team.find((member) => member.id === conversation.assigneeId)}
            selected={conversation.id === selectedId}
            // Only the view of everything mixes statuses; elsewhere it would be noise.
            showStatus={searching || view.id === "all"}
            onSelect={() => {
              onSelect(conversation);
            }}
          />
        )}
        renderEmpty={() => (
          <EmptyState
            size="sm"
            className="pt-8"
            scene={searching ? false : "all-caught-up"}
            title={
              searching
                ? "No conversations found"
                : view.id === "open"
                  ? "All caught up"
                  : "Nothing here"
            }
            description={
              searching
                ? "Try a name, an email address, or words from a message."
                : view.id === "open"
                  ? "Nothing is waiting for the team."
                  : `Nothing is in ${view.label} right now.`
            }
          />
        )}
        // The list is a narrow column; running out of rows says enough.
        renderEnd={() => null}
        messages={{
          loading: "Loading conversations",
          error: "The inbox could not be loaded.",
        }}
        className="min-h-0 flex-1 overflow-y-auto"
        contentClassName="p-1.5"
        listClassName="flex flex-col gap-px"
      />
    </Panel>
  );
}

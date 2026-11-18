"use client";

import { type ConversationStatus, type ConversationWithContact } from "@helpwren/core";
import {
  Avatar,
  Button,
  cn,
  EmptyState,
  SearchField,
  Skeleton,
  StatusChip,
  type StatusName,
} from "@helpwren/design-system";

import { Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";

import { contactName } from "../contact-name";
import { type InboxView } from "../hooks/use-inbox";

const chipFor: Record<ConversationStatus, StatusName> = {
  open: "open",
  pending: "waiting",
  resolved: "resolved",
  closed: "closed",
};

interface RowProps {
  conversation: ConversationWithContact;
  selected: boolean;
  showStatus: boolean;
  onSelect: () => void;
}

/** One conversation in the list. Unread ones are heavier, so they stand out when scanning. */
function Row({ conversation, selected, showStatus, onSelect }: RowProps) {
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
          <span className={cn("truncate", unread > 0 ? "font-semibold" : "font-medium")}>
            {name}
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
            {conversation.lastMessagePreview}
          </span>
          {unread > 0 ? (
            <span className="bg-primary text-primary-foreground text-2xs grid h-4 min-w-4 shrink-0 place-items-center rounded-full px-1 font-medium">
              {unread}
              <span className="sr-only"> unread</span>
            </span>
          ) : showStatus ? (
            <StatusChip status={chipFor[conversation.status]} size="sm" className="shrink-0" />
          ) : null}
        </span>
      </span>
    </button>
  );
}

export interface ListPanelProps {
  conversations: readonly ConversationWithContact[] | undefined;
  failed: boolean;
  onRetry: () => void;
  view: InboxView;
  /** What is typed in the search box. */
  search: string;
  onSearchChange: (search: string) => void;
  /** True while showing search results in place of the view. */
  searching: boolean;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

/** The left panel: every conversation, most recently active first. */
export function ListPanel({
  conversations,
  failed,
  onRetry,
  view,
  search,
  onSearchChange,
  searching,
  loading,
  selectedId,
  onSelect,
  className,
}: ListPanelProps) {
  return (
    <Panel aria-label="Conversations" className={className}>
      <PanelHeader>
        <h2 className="flex items-baseline gap-1.5 font-semibold">
          {searching ? "Results" : view.label}
          {conversations ? (
            <span className="text-muted-foreground text-xs font-normal tabular-nums">
              {conversations.length}
            </span>
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
          loading={searching && loading}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {failed ? (
          <EmptyState
            scene={false}
            size="sm"
            title="The inbox could not be loaded."
            action={
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Try again
              </Button>
            }
          />
        ) : !conversations ? (
          <div className="grid gap-1.5 p-1" aria-busy="true" aria-label="Loading conversations">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ) : conversations.length === 0 ? (
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
                  : `No conversations are in ${view.label.toLowerCase()}.`
            }
          />
        ) : (
          <ul aria-label="Conversations" className="flex flex-col gap-px">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Row
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  // Only the view of everything mixes statuses; elsewhere it would be noise.
                  showStatus={searching || view.id === "all"}
                  onSelect={() => {
                    onSelect(conversation.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

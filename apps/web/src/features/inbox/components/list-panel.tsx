"use client";

import { type ConversationStatus, type ConversationWithContact } from "@helpwren/core";
import {
  Badge,
  Button,
  cn,
  ConversationListItem,
  EmptyState,
  Skeleton,
  type StatusName,
} from "@helpwren/design-system";

import { formatTimeAgo } from "@/lib/format-time";

import { contactName } from "../contact-name";
import { type InboxFilter } from "../hooks/use-inbox";
import { Panel, PanelHeader } from "./panel";

const filters: readonly { value: InboxFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "all", label: "All" },
];

const chipFor: Record<ConversationStatus, StatusName> = {
  open: "open",
  pending: "waiting",
  resolved: "resolved",
  closed: "closed",
};

export interface ListPanelProps {
  conversations: readonly ConversationWithContact[] | undefined;
  failed: boolean;
  onRetry: () => void;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

/** The left panel: every conversation, most recently active first. */
export function ListPanel({
  conversations,
  failed,
  onRetry,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  className,
}: ListPanelProps) {
  return (
    <Panel aria-label="Conversations" className={className}>
      <PanelHeader className="justify-between">
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          Inbox
          {conversations ? <Badge>{conversations.length}</Badge> : null}
        </h1>
        <div role="group" aria-label="Show" className="flex gap-1">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              className={cn(
                "border-line focus-visible:outline-ring h-7 rounded-full px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                filter === option.value
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                onFilterChange(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PanelHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
          <div className="grid gap-2 p-1" aria-busy="true" aria-label="Loading conversations">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            scene="all-caught-up"
            size="sm"
            className="pt-8"
            title={filter === "open" ? "All caught up" : "No conversations yet"}
            description={
              filter === "open"
                ? "Nothing is waiting for the team."
                : "Conversations appear here as soon as someone writes."
            }
          />
        ) : (
          <ul aria-label="Conversations" className="flex flex-col gap-0.5">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <ConversationListItem
                  name={contactName(conversation.contact)}
                  preview={conversation.lastMessagePreview ?? ""}
                  time={
                    conversation.lastMessageAt
                      ? formatTimeAgo(conversation.lastMessageAt)
                      : undefined
                  }
                  unread={conversation.unreadForAgents}
                  selected={conversation.id === selectedId}
                  // In the open view every row has the same status, so it would only be noise.
                  {...(filter === "all" ? { status: chipFor[conversation.status] } : {})}
                  onClick={() => {
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

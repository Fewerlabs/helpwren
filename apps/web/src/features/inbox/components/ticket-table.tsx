"use client";

import {
  type ConversationChanges,
  type ConversationFilter,
  type ConversationPriority,
  type ConversationStatus,
  type ConversationWithContact,
  type Team,
  type TeamMember,
} from "@helpwren/core";
import {
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  Icon,
  InlineSelect,
  QueryList,
  SearchField,
  StatusChip,
  Tooltip,
  type DataTableColumn,
  type FilterDefinition,
  type FilterValue,
} from "@helpwren/design-system";
import { useMemo, useState } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";
import { useDebounced } from "@/lib/use-debounced";

import { contactName } from "../contact-name";
import { useConfirmStatus } from "../hooks/use-confirm-status";
import { INBOX_QUERY_KEY, MIN_SEARCH_LENGTH } from "../hooks/use-inbox";
import { statuses, ticketLabel } from "../labels";
import {
  assigneeOptions,
  teamOptions,
  NOBODY,
  Person,
  priorityOptions,
  statusOptions,
  unassigned,
} from "../options";
import { PriorityLabel } from "./priority-label";

/** Turns what the filter bar holds into what the database is asked for. No values means any. */
function toFilter(value: FilterValue): ConversationFilter {
  const chosen = (id: string) => {
    const values = value[id];
    return values && values.length > 0 ? values : undefined;
  };
  return {
    status: chosen("status") as ConversationStatus[] | undefined,
    priority: chosen("priority") as ConversationPriority[] | undefined,
    assignees: chosen("assignee")?.map((id) => (id === NOBODY ? null : id)),
    teams: chosen("team")?.map((id) => (id === NOBODY ? null : id)),
  };
}

export interface TicketTableProps {
  team: readonly TeamMember[];
  /** The install's teams, for filtering by one. */
  teams: readonly Team[];
  onOpen: (id: string) => void;
  /** Changes one ticket in place, from its row. */
  onChange: (id: string, changes: ConversationChanges) => void;
}

/**
 * Every ticket in one table, to filter, search and change in place. A ticket is tracked by its
 * number, status and owner more than by its latest message, so it is laid out as a row of
 * those and not as a chat.
 */
export function TicketTable({ team, teams, onOpen, onChange }: TicketTableProps) {
  const getClient = useHelpwren();
  const confirmStatus = useConfirmStatus();
  const [filters, setFilters] = useState<FilterValue>({});
  const [search, setSearch] = useState("");
  const searchText = useDebounced(search).trim();
  // A ticket number counts as enough to search for, however short.
  const searching = searchText.length >= MIN_SEARCH_LENGTH || /^#?\d+$/.test(searchText);
  const narrowed = searching || Object.values(filters).some((values) => values.length > 0);
  const filter = useMemo(() => ({ ...toFilter(filters), type: "ticket" as const }), [filters]);

  const assignees = useMemo(() => assigneeOptions(team), [team]);
  const definitions = useMemo<FilterDefinition[]>(
    () => [
      { id: "status", label: "Status", icon: "check-circle", options: statusOptions },
      { id: "priority", label: "Priority", icon: "warning-circle", options: priorityOptions },
      { id: "assignee", label: "Assignee", icon: "user", options: assignees },
      // Offered only once there are teams to filter by.
      ...(teams.length > 0
        ? [{ id: "team", label: "Team", icon: "users" as const, options: teamOptions(teams) }]
        : []),
    ],
    [assignees, teams],
  );

  const columns = useMemo<DataTableColumn<ConversationWithContact>[]>(
    () => [
      {
        id: "number",
        header: "Number",
        width: "5.5rem",
        className: "text-muted-foreground font-mono text-xs",
        cell: (ticket) => ticketLabel(ticket),
      },
      {
        id: "subject",
        header: "Subject",
        rowHeader: true,
        className: "max-w-0 w-[36%]",
        cell: (ticket) => (
          <button
            type="button"
            className="focus-visible:outline-ring block max-w-full truncate rounded-md text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => {
              onOpen(ticket.id);
            }}
          >
            {ticket.subject ?? ticket.lastMessagePreview}
          </button>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        className: "text-muted-foreground max-lg:hidden",
        headerClassName: "max-lg:hidden",
        cell: (ticket) => contactName(ticket.contact),
      },
      {
        id: "status",
        header: "Status",
        cell: (ticket) => (
          <InlineSelect
            label={`Status of ${ticketLabel(ticket)}`}
            value={ticket.status}
            options={statusOptions}
            onValueChange={(value) => {
              const status = value as ConversationStatus;
              void confirmStatus(status, ticket).then((confirmed) => {
                if (confirmed) onChange(ticket.id, { status });
              });
            }}
          >
            <StatusChip status={statuses[ticket.status].chip} size="sm" />
          </InlineSelect>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        className: "max-md:hidden",
        headerClassName: "max-md:hidden",
        cell: (ticket) => (
          <InlineSelect
            label={`Priority of ${ticketLabel(ticket)}`}
            value={ticket.priority}
            options={priorityOptions}
            onValueChange={(value) => {
              onChange(ticket.id, { priority: value as ConversationPriority });
            }}
          >
            <PriorityLabel priority={ticket.priority} />
          </InlineSelect>
        ),
      },
      {
        id: "assignee",
        header: "Assignee",
        className: "max-md:hidden",
        headerClassName: "max-md:hidden",
        cell: (ticket) => {
          const assignee = team.find((member) => member.id === ticket.assigneeId);
          return (
            <InlineSelect
              label={`Assignee of ${ticketLabel(ticket)}`}
              value={ticket.assigneeId ?? NOBODY}
              options={assignees}
              onValueChange={(value) => {
                onChange(ticket.id, { assigneeId: value === NOBODY ? null : value });
              }}
            >
              {assignee ? <Person name={assignee.name} photo={assignee.photo} /> : unassigned}
            </InlineSelect>
          );
        },
      },
      {
        id: "updated",
        header: "Updated",
        align: "end",
        className: "text-muted-foreground tabular-nums",
        cell: (ticket) => (ticket.lastMessageAt ? formatTimeAgo(ticket.lastMessageAt) : ""),
      },
    ],
    [assignees, confirmStatus, onChange, onOpen, team],
  );

  return (
    <QueryList<ConversationWithContact, string>
      // Under the inbox's key, so a change anywhere in the inbox refreshes the table too.
      queryKey={[...INBOX_QUERY_KEY, "tickets", filter, searching ? searchText : ""]}
      queryFn={async ({ cursor, pageSize }) => {
        const client = getClient();
        // Filtering, searching and paging are all the database's work.
        return searching
          ? { items: await client.conversations.search(searchText, filter) }
          : client.conversations.list({ ...filter, cursor, limit: pageSize });
      }}
      pageSize={50}
      loadMoreOn="button"
    >
      {(list) => (
        <Panel aria-label="Tickets" className="h-full">
          <PanelHeader>
            <h2 className="flex items-baseline gap-1.5 font-semibold">
              Tickets
              {list.status === "loading" ? null : (
                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                  {list.items.length}
                  {list.hasMore ? "+" : ""}
                </span>
              )}
            </h2>
            <span className="flex-1" />
            <Tooltip content="Refresh">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh tickets"
                loading={list.isFetching}
                onClick={list.refetch}
              >
                <Icon name="arrows-clockwise" />
              </Button>
            </Tooltip>
            <SearchField
              aria-label="Search tickets"
              placeholder="Search by number, subject or contact"
              className="bg-muted dark:bg-muted min-h-8 w-72 border-transparent max-sm:w-44"
              value={search}
              onValueChange={setSearch}
              loading={list.isFetching && searchText !== ""}
            />
          </PanelHeader>
          <div className="border-rule border-b px-3 py-2">
            <FilterBar filters={definitions} value={filters} onValueChange={setFilters} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.status === "error" ? (
              <EmptyState
                scene={false}
                size="sm"
                className="pt-10"
                title="Tickets could not be loaded."
                action={
                  <Button variant="secondary" size="sm" onClick={list.retry}>
                    Try again
                  </Button>
                }
              />
            ) : (
              <>
                <DataTable
                  caption="Tickets"
                  density="compact"
                  columns={columns}
                  rows={list.items}
                  getRowKey={(ticket) => ticket.id}
                  loading={list.isFetching}
                  empty={
                    <EmptyState
                      scene={narrowed ? false : "all-caught-up"}
                      size="sm"
                      className="py-10"
                      title={narrowed ? "No tickets match" : "No tickets yet"}
                      description={
                        narrowed
                          ? "Try a different search, or remove a filter."
                          : "Convert a conversation to a ticket when it needs tracking beyond the chat."
                      }
                    />
                  }
                />
                {list.hasMore ? (
                  <div className="flex justify-center py-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={list.isFetchingMore}
                      onClick={list.loadMore}
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Panel>
      )}
    </QueryList>
  );
}

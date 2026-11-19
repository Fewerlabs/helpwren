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
  EmptyState,
  FilterBar,
  Icon,
  InlineSelect,
  QueryTable,
  RowLink,
  SearchField,
  StatusChip,
  Tooltip,
  type DataTableColumn,
  type FilterDefinition,
  type FilterValue,
} from "@helpwren/design-system";
import { useMemo } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";
import { useListParams, type ListParamsOptions } from "@/lib/use-list-params";

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

// The inbox keeps its own view and open conversation in the address too, so the table's keys
// carry a prefix: `tickets.status=open&tickets.page=2`.
const listOptions: ListParamsOptions = {
  prefix: "tickets",
  filters: ["status", "priority", "assignee", "team"],
  pageSizeKey: "tickets",
};

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
  const list = useListParams(listOptions);
  // A ticket number counts as enough to search for, however short.
  const searching = list.query.length >= MIN_SEARCH_LENGTH || /^#?\d+$/.test(list.query);
  const search = searching ? list.query : "";
  const filter = { ...toFilter(list.filters), type: "ticket" as const };

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
          <RowLink
            onClick={() => {
              onOpen(ticket.id);
            }}
          >
            {ticket.subject ?? ticket.lastMessagePreview}
          </RowLink>
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
    <Panel aria-label="Tickets" className="h-full">
      <QueryTable<ConversationWithContact>
        // Under the inbox's key, so a change anywhere in the inbox refreshes the table too.
        queryKey={[...INBOX_QUERY_KEY, "tickets", filter, search]}
        // Searching, filtering and paging are all the database's work, so a search reaches
        // every match and its total is the true one.
        queryFn={({ page, pageSize }) =>
          getClient().conversations.list({ ...filter, search, page, limit: pageSize })
        }
        page={list.page}
        onPageChange={list.setPage}
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        noun={{ one: "ticket", other: "tickets" }}
        caption="Tickets"
        density="compact"
        columns={columns}
        getRowKey={(ticket) => ticket.id}
        // A phone has room for the subject and a line under it, so the row is read, then
        // opened to change it.
        renderMobileRow={(ticket) => {
          const assignee = team.find((member) => member.id === ticket.assigneeId);
          const group = teams.find((item) => item.id === ticket.teamId);
          return (
            <button
              type="button"
              className="hover:bg-muted/50 focus-visible:outline-ring grid w-full gap-1.5 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
              onClick={() => {
                onOpen(ticket.id);
              }}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {ticketLabel(ticket)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {ticket.subject ?? ticket.lastMessagePreview}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {ticket.lastMessageAt ? formatTimeAgo(ticket.lastMessageAt) : ""}
                </span>
              </span>
              <span className="text-muted-foreground flex min-w-0 items-center gap-3 text-xs">
                <StatusChip status={statuses[ticket.status].chip} size="sm" />
                <PriorityLabel priority={ticket.priority} />
                <span className="min-w-0 truncate">
                  {assignee?.name ?? group?.name ?? "Unassigned"}
                </span>
              </span>
            </button>
          );
        }}
        filtered={searching || Object.values(list.filters).some((chosen) => chosen.length > 0)}
        empty={
          <EmptyState
            scene="all-caught-up"
            size="sm"
            className="py-10"
            title="No tickets yet"
            description="Convert a conversation to a ticket when it needs tracking beyond the chat."
          />
        }
        messages={{ error: "Tickets could not be loaded.", pagination: "Tickets pages" }}
        toolbar={({ total, isFetching, refetch }) => (
          <>
            <PanelHeader>
              <h2 className="flex items-baseline gap-1.5 font-semibold">
                Tickets
                {total === undefined ? null : (
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    {total}
                  </span>
                )}
              </h2>
              <span className="flex-1" />
              <Tooltip content="Refresh">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Refresh tickets"
                  loading={isFetching}
                  onClick={refetch}
                >
                  <Icon name="arrows-clockwise" />
                </Button>
              </Tooltip>
              <SearchField
                aria-label="Search tickets"
                placeholder="Search by number, subject or contact"
                className="bg-muted dark:bg-muted min-h-8 w-72 border-transparent max-sm:w-44"
                value={list.search}
                onValueChange={list.setSearch}
                loading={isFetching && list.query !== ""}
              />
            </PanelHeader>
            <div className="border-rule border-b px-3 py-2">
              <FilterBar
                filters={definitions}
                value={list.filters}
                onValueChange={list.setFilters}
              />
            </div>
          </>
        )}
      />
    </Panel>
  );
}

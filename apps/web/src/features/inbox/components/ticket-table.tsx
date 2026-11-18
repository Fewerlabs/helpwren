"use client";

import {
  type ConversationChanges,
  type ConversationPriority,
  type ConversationWithContact,
  type TeamMember,
} from "@helpwren/core";
import {
  Button,
  cn,
  EmptyState,
  Skeleton,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@helpwren/design-system";

import { Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";

import { contactName } from "../contact-name";
import { priorities, statuses, ticketLabel } from "../labels";
import { NOBODY, Picker } from "./picker";

export interface TicketTableProps {
  tickets: readonly ConversationWithContact[] | undefined;
  team: readonly TeamMember[];
  failed: boolean;
  onRetry: () => void;
  onOpen: (id: string) => void;
  /** Changes one ticket in place, from its row. */
  onChange: (id: string, changes: ConversationChanges) => void;
}

const head = "text-muted-foreground h-9 text-xs font-normal";

/**
 * Every ticket in one table. A ticket is tracked by its number, status and owner more than by
 * its latest message, so it is laid out as a row of those and not as a chat.
 */
export function TicketTable({
  tickets,
  team,
  failed,
  onRetry,
  onOpen,
  onChange,
}: TicketTableProps) {
  return (
    <Panel aria-label="Tickets" className="h-full">
      <PanelHeader>
        <h2 className="flex items-baseline gap-1.5 font-semibold">
          Tickets
          {tickets ? (
            <span className="text-muted-foreground text-xs font-normal tabular-nums">
              {tickets.length}
            </span>
          ) : null}
        </h2>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed ? (
          <EmptyState
            scene={false}
            size="sm"
            className="pt-10"
            title="Tickets could not be loaded."
            action={
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Try again
              </Button>
            }
          />
        ) : !tickets ? (
          <div className="grid gap-2 p-4" aria-busy="true" aria-label="Loading tickets">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            scene="all-caught-up"
            size="sm"
            className="pt-10"
            title="No tickets yet"
            description="Convert a conversation to a ticket when it needs tracking beyond the chat."
          />
        ) : (
          <Table aria-label="Tickets">
            <TableHeader>
              <TableRow>
                <TableHead className={cn(head, "pl-4")}>Number</TableHead>
                <TableHead className={head}>Subject</TableHead>
                <TableHead className={cn(head, "max-lg:hidden")}>Contact</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={cn(head, "max-md:hidden")}>Priority</TableHead>
                <TableHead className={cn(head, "max-md:hidden")}>Assignee</TableHead>
                <TableHead className={cn(head, "pr-4 text-end")}>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="h-11">
                  <TableCell className="text-muted-foreground pl-4 font-mono text-xs">
                    {ticketLabel(ticket)}
                  </TableCell>
                  <TableCell className="w-[40%] max-w-0">
                    <button
                      type="button"
                      className="focus-visible:outline-ring block max-w-full truncate rounded-md text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                      onClick={() => {
                        onOpen(ticket.id);
                      }}
                    >
                      {ticket.subject ?? ticket.lastMessagePreview}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-lg:hidden">
                    {contactName(ticket.contact)}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={statuses[ticket.status].chip} size="sm" />
                  </TableCell>
                  <TableCell className="max-md:hidden">
                    <Picker
                      label={`Priority of ${ticketLabel(ticket)}`}
                      className={cn("w-24", ticket.priority === "high" && "text-destructive")}
                      value={ticket.priority}
                      options={Object.entries(priorities).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      onChange={(value) => {
                        onChange(ticket.id, { priority: value as ConversationPriority });
                      }}
                    />
                  </TableCell>
                  <TableCell className="max-md:hidden">
                    <Picker
                      label={`Assignee of ${ticketLabel(ticket)}`}
                      className="w-36"
                      value={ticket.assigneeId ?? NOBODY}
                      options={[
                        { value: NOBODY, label: "Unassigned" },
                        // Someone deactivated while holding a ticket still shows as its assignee.
                        ...team
                          .filter((member) => member.active || member.id === ticket.assigneeId)
                          .map((member) => ({ value: member.id, label: member.name })),
                      ]}
                      onChange={(value) => {
                        onChange(ticket.id, { assigneeId: value === NOBODY ? null : value });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground pr-4 text-end tabular-nums">
                    {ticket.lastMessageAt ? formatTimeAgo(ticket.lastMessageAt) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Panel>
  );
}

"use client";

import { type ContactSummary } from "@helpwren/core";
import {
  Avatar,
  cn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@helpwren/design-system";

import { formatTimeAgo } from "@/lib/format-time";

import { contactLabel } from "../contact-label";
import { KindBadge } from "./kind-badge";

export interface ContactTableProps {
  contacts: readonly ContactSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const head = "text-muted-foreground h-9 text-xs font-normal";

/** The list of contacts. The name in each row is a button that opens that person. */
export function ContactTable({ contacts, selectedId, onSelect }: ContactTableProps) {
  return (
    <Table aria-label="Contacts">
      <TableHeader>
        <TableRow>
          <TableHead className={cn(head, "pl-4")}>Name</TableHead>
          <TableHead className={cn(head, "max-lg:hidden")}>Email or phone</TableHead>
          <TableHead className={head}>Type</TableHead>
          <TableHead className={cn(head, "text-end max-sm:hidden")}>Conversations</TableHead>
          <TableHead className={cn(head, "pr-4 text-end")}>Last active</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => {
          const label = contactLabel(contact);
          const selected = contact.id === selectedId;
          return (
            <TableRow
              key={contact.id}
              data-state={selected ? "selected" : undefined}
              className={cn("h-11", selected && "bg-muted")}
            >
              <TableCell className="pl-4">
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  className="focus-visible:outline-ring flex max-w-full items-center gap-2.5 rounded-md text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={() => {
                    onSelect(contact.id);
                  }}
                >
                  <Avatar name={label} size="sm" className="text-2xs size-6" />
                  <span className="truncate">{label}</span>
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground max-lg:hidden">
                {contact.email ?? contact.phone ?? "Not given"}
              </TableCell>
              <TableCell>
                <KindBadge contact={contact} />
              </TableCell>
              <TableCell className="text-end tabular-nums max-sm:hidden">
                {contact.conversationCount}
              </TableCell>
              <TableCell className="text-muted-foreground pr-4 text-end tabular-nums">
                {contact.lastActiveAt ? formatTimeAgo(contact.lastActiveAt) : "Never"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

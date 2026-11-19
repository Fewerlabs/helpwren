import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Avatar } from "../avatar/avatar";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { Link } from "../link/link";
import { StatusChip } from "../status-chip/status-chip";
import {
  DataTable,
  type DataTableColumn,
  type DataTableKey,
  type DataTableSort,
} from "./data-table";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

// DataTable is generic, so the stories set its props in `render` instead of through `args`.
const meta: Meta = { title: "Base/Table" };

export default meta;
type Story = StoryObj;

interface Ticket {
  number: number;
  subject: string;
  contact: string;
  status: "open" | "waiting" | "resolved" | "urgent" | "closed";
  priority: "low" | "normal" | "high";
  refund: number | null;
  updated: string;
}

const tickets: Ticket[] = [
  {
    number: 1042,
    subject: "Charged twice for a booking",
    contact: "Ada Lovelace",
    status: "urgent",
    priority: "high",
    refund: 120,
    updated: "2026-11-18",
  },
  {
    number: 1041,
    subject: "Cannot log in on iOS",
    contact: "Grace Hopper",
    status: "open",
    priority: "normal",
    refund: null,
    updated: "2026-11-17",
  },
  {
    number: 1040,
    subject: "Change booking date",
    contact: "Alan Turing",
    status: "waiting",
    priority: "low",
    refund: null,
    updated: "2026-11-17",
  },
  {
    number: 1039,
    subject: "Refund for cancelled class",
    contact: "Katherine Johnson",
    status: "resolved",
    priority: "normal",
    refund: 45.5,
    updated: "2026-11-15",
  },
  {
    number: 1038,
    subject: "Payout has not arrived",
    contact: "Margaret Hamilton",
    status: "closed",
    priority: "high",
    refund: 800,
    updated: "2026-11-12",
  },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const columns: DataTableColumn<Ticket>[] = [
  {
    id: "number",
    header: "Ticket",
    width: "6rem",
    sortable: true,
    sortValue: (ticket) => ticket.number,
    cell: (ticket) => <span className="font-mono text-xs">#{ticket.number}</span>,
  },
  {
    id: "subject",
    header: "Subject",
    rowHeader: true,
    sortable: true,
    sortValue: (ticket) => ticket.subject,
    cell: (ticket) => <Link href="https://helpwren.fewerlabs.dev">{ticket.subject}</Link>,
  },
  {
    id: "contact",
    header: "Contact",
    sortable: true,
    sortValue: (ticket) => ticket.contact,
    cell: (ticket) => (
      <span className="flex items-center gap-2">
        <Avatar name={ticket.contact} size="sm" className="size-6 text-[0.625rem]" />
        {ticket.contact}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (ticket) => <StatusChip status={ticket.status} size="sm" />,
  },
  {
    id: "refund",
    header: "Refund",
    align: "end",
    sortable: true,
    sortValue: (ticket) => ticket.refund,
    cell: (ticket) =>
      ticket.refund === null ? (
        <span className="text-muted-foreground">None</span>
      ) : (
        money.format(ticket.refund)
      ),
    footer: (rows) => money.format(rows.reduce((total, ticket) => total + (ticket.refund ?? 0), 0)),
  },
];

const base = {
  columns,
  rows: tickets,
  getRowKey: (ticket: Ticket) => ticket.number,
  caption: "Tickets",
};

/** Press a column header to sort: ascending, descending, then back to the original order. */
export const Default: Story = { render: () => <DataTable {...base} /> };

function Selectable() {
  const [selected, setSelected] = useState<DataTableKey[]>([1041]);
  return (
    <div className="grid gap-3">
      <div className="flex min-h-8 items-center gap-3 text-sm">
        <Badge variant="accent">{selected.length}</Badge> selected
        {selected.length > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelected([]);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <DataTable
        {...base}
        selectable
        selectedKeys={selected}
        onSelectedKeysChange={setSelected}
        isRowSelectable={(ticket) => ticket.status !== "closed"}
        messages={{ selectRow: (key) => `Select ticket ${key}` }}
      />
    </div>
  );
}

export const Selection: Story = { render: () => <Selectable /> };

function ServerSorted() {
  const [sort, setSort] = useState<DataTableSort | null>({ column: "number", direction: "desc" });
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground font-mono text-xs">
        The request would be: ?sort={sort ? `${sort.column}:${sort.direction}` : "none"}
      </p>
      <DataTable {...base} manualSorting sort={sort} onSortChange={setSort} />
    </div>
  );
}

/** With `manualSorting` the table reports the chosen sort and leaves the order to the server. */
export const ServerSideSorting: Story = { render: () => <ServerSorted /> };

export const Loading: Story = { render: () => <DataTable {...base} rows={[]} loading /> };

/** With rows already showing, loading is a progress bar under the header. */
export const Refreshing: Story = { render: () => <DataTable {...base} loading /> };

export const Empty: Story = {
  render: () => (
    <DataTable
      {...base}
      rows={[]}
      empty={
        <div className="grid justify-items-center gap-2">
          <Icon name="ticket" className="size-8" weight="light" />
          <p className="text-foreground font-medium">No tickets match these filters.</p>
          <Button size="sm" variant="secondary">
            Clear filters
          </Button>
        </div>
      }
    />
  ),
};

export const CompactStripedSticky: Story = {
  render: () => (
    <DataTable
      {...base}
      rows={[...tickets, ...tickets.map((ticket) => ({ ...ticket, number: ticket.number - 5 }))]}
      density="compact"
      striped
      stickyHeader
      containerClassName="border-line bg-card max-h-64 overflow-y-auto rounded-xl"
    />
  ),
};

/**
 * With `renderMobileRow`, a narrow screen gets a list in place of the table: the subject first,
 * then a line of what else matters, and the whole row is one link. Narrow the window to see it.
 */
export const MobileRows: Story = {
  render: () => (
    <DataTable
      {...base}
      renderMobileRow={(ticket) => (
        <a
          href="https://helpwren.fewerlabs.dev"
          className="hover:bg-muted/50 grid gap-1 px-3 py-2.5"
        >
          <span className="truncate font-medium">{ticket.subject}</span>
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            <StatusChip status={ticket.status} size="sm" />
            <span className="font-mono">#{ticket.number}</span>
            <span className="truncate">{ticket.contact}</span>
          </span>
        </a>
      )}
    />
  ),
};

/** The parts on their own, for a table laid out by hand. */
export const Parts: Story = {
  render: () => (
    <Table className="max-w-sm">
      <TableCaption>Keyboard shortcuts</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Action</TableHead>
          <TableHead scope="col" className="text-right">
            Keys
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Search</TableCell>
          <TableCell className="text-right font-mono text-xs">⌘K</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Send reply</TableCell>
          <TableCell className="text-right font-mono text-xs">⌘↵</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Dark: Story = {
  render: () => <DataTable {...base} selectable defaultSelectedKeys={[1042]} />,
  globals: { theme: "dark" },
};

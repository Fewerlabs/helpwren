import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Avatar } from "../base/avatar/avatar";
import { StatusChip } from "../base/status-chip/status-chip";
import type { DataTableColumn } from "../base/table/data-table";
import { RowLink } from "../base/table/row-link";
import { EmptyState } from "../shared/empty-state/empty-state";
import { SearchField } from "../shared/search-field/search-field";
import type { QueryListRequest } from "./query-list";
import { QueryTable, type QueryTableProps } from "./query-table";
import { QueryProvider } from "./test-utils";

// QueryTable is generic, so the stories set its props in `render` instead of through `args`.
const meta: Meta = {
  title: "Data/QueryTable",
  decorators: [
    (Story) => (
      <QueryProvider>
        {/* A panel of fixed height, like a dashboard page: the rows scroll, the footer stays. */}
        <section
          aria-label="Contacts"
          className="border-line bg-card flex h-[28rem] max-w-3xl flex-col overflow-hidden rounded-xl"
        >
          <Story />
        </section>
      </QueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

interface Contact {
  id: number;
  name: string;
  email: string;
  status: "open" | "waiting" | "resolved";
}

const names = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson"];
const statuses = ["open", "waiting", "resolved"] as const;
const contacts: Contact[] = Array.from({ length: 132 }, (_, index) => ({
  id: index + 1,
  name: `${names[index % 4] ?? ""} ${String(index + 1)}`,
  email: `person${String(index + 1)}@example.com`,
  status: statuses[index % 3] ?? "open",
}));

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/** Stands in for GET /contacts?page=&pageSize=&search=. */
function fetchContacts(rows: readonly Contact[] = contacts) {
  return async ({ page, pageSize = 25, signal }: QueryListRequest<unknown>) => {
    await wait(500, signal);
    const start = (page - 1) * pageSize;
    return { items: rows.slice(start, start + pageSize), total: rows.length };
  };
}

const columns: DataTableColumn<Contact>[] = [
  {
    id: "name",
    header: "Name",
    rowHeader: true,
    cell: (contact) => (
      <RowLink leading={<Avatar name={contact.name} size="sm" className="text-2xs size-6" />}>
        {contact.name}
      </RowLink>
    ),
  },
  {
    id: "email",
    header: "Email",
    className: "text-muted-foreground max-md:hidden",
    headerClassName: "max-md:hidden",
    cell: (contact) => contact.email,
  },
  {
    id: "status",
    header: "Status",
    cell: (contact) => <StatusChip status={contact.status} size="sm" />,
  },
];

const base: Omit<QueryTableProps<Contact>, "queryKey" | "queryFn"> = {
  caption: "Contacts",
  density: "compact",
  columns,
  getRowKey: (contact) => contact.id,
  pageSize: 25,
  noun: { one: "contact", other: "contacts" },
  messages: { pagination: "Contacts pages", error: "Contacts could not be loaded." },
  renderMobileRow: (contact) => (
    <div className="grid gap-1 px-3 py-2.5">
      <span className="truncate font-medium">{contact.name}</span>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <StatusChip status={contact.status} size="sm" />
        <span className="truncate">{contact.email}</span>
      </span>
    </div>
  ),
};

/** Waits for the rows, so the accessibility check sees the table and not its first load. */
const waitForRows: Story["play"] = async ({ canvas }) => {
  await canvas.findAllByRole("row", {}, { timeout: 3000 });
  await canvas.findByRole("navigation", { name: "Contacts pages" }, { timeout: 3000 });
};

/** Page through 132 contacts, and change the rows per page in the footer. */
export const Default: Story = {
  render: () => (
    <QueryTable<Contact> {...base} queryKey={["stories", "table"]} queryFn={fetchContacts()} />
  ),
  play: waitForRows,
};

/** The first load: placeholder rows in the table's own shape. */
export const Loading: Story = {
  render: () => (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "loading"]}
      queryFn={() => new Promise(() => undefined)}
    />
  ),
};

export const ErrorWithRetry: Story = {
  render: () => (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "error"]}
      queryFn={async ({ signal }) => {
        await wait(300, signal);
        throw new Error("Network error");
      }}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "empty"]}
      queryFn={fetchContacts([])}
      empty={
        <EmptyState
          scene="visitors"
          size="sm"
          title="No contacts yet"
          description="People appear here once they have written to you."
        />
      }
    />
  ),
};

/** A search that finds nothing says so, instead of claiming there are no contacts at all. */
function Searchable() {
  const [search, setSearch] = useState("zebra");
  const rows = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "search", search]}
      queryFn={fetchContacts(rows)}
      filtered={search.trim() !== ""}
      toolbar={({ total }) => (
        <header className="border-rule flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
          <h2 className="text-sm font-semibold">
            Contacts{" "}
            <span className="text-muted-foreground text-xs font-normal tabular-nums">
              {total ?? ""}
            </span>
          </h2>
          <SearchField
            aria-label="Search contacts"
            value={search}
            onValueChange={setSearch}
            className="min-h-8 w-48"
          />
        </header>
      )}
    />
  );
}

export const FilteredEmpty: Story = { render: () => <Searchable /> };

/** The footer's parts can each be turned off: here the picker and the summary. */
export const FooterOptions: Story = {
  render: () => (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "options"]}
      queryFn={fetchContacts()}
      pageSizeOptions={false}
      showSummary={false}
    />
  ),
  play: waitForRows,
};

/** No footer at all, with `showPagination={false}`. */
export const NoFooter: Story = {
  render: () => (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "no-footer"]}
      queryFn={fetchContacts(contacts.slice(0, 8))}
      showPagination={false}
    />
  ),
  play: async ({ canvas }) => {
    await canvas.findAllByText("Ada Lovelace 1", {}, { timeout: 3000 });
  },
};

/**
 * On a phone, Load more adds the next page under the rows instead of replacing them. A very
 * wide `mobileBreakpoint` makes any screen count as a phone here; narrow the window to see the
 * rows as a list too.
 */
export const MobileLoadMore: Story = {
  render: () => (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "mobile"]}
      queryFn={fetchContacts()}
      mobileBreakpoint={100_000}
    />
  ),
  play: waitForRows,
};

/** Drag a row by its handle, or move it with the keyboard. The order is kept until it is saved. */
function Reorderable() {
  const [rows, setRows] = useState(contacts.slice(0, 6));
  return (
    <QueryTable<Contact>
      {...base}
      queryKey={["stories", "table", "reorder", rows.map((row) => row.id)]}
      queryFn={fetchContacts(rows)}
      pagination="none"
      reorder={{
        label: (contact) => contact.name,
        onReorder: async (keys) => {
          await new Promise((resolve) => setTimeout(resolve, 400));
          setRows(keys.flatMap((key) => rows.find((row) => row.id === key) ?? []));
        },
      }}
    />
  );
}

export const Reorder: Story = { render: () => <Reorderable /> };

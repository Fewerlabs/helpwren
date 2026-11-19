import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

interface Ticket {
  id: number;
  subject: string;
  amount: number | null;
}

const tickets: Ticket[] = [
  { id: 1, subject: "Refund", amount: 30 },
  { id: 2, subject: "booking change", amount: 120 },
  { id: 3, subject: "Account", amount: null },
  { id: 4, subject: "Payout 10", amount: 9 },
];

const columns: DataTableColumn<Ticket>[] = [
  {
    id: "subject",
    header: "Subject",
    cell: (ticket) => ticket.subject,
    sortable: true,
    sortValue: (ticket) => ticket.subject,
    rowHeader: true,
  },
  {
    id: "amount",
    header: "Amount",
    cell: (ticket) => ticket.amount ?? "none",
    sortable: true,
    sortValue: (ticket) => ticket.amount,
    align: "end",
    footer: (rows) => rows.reduce((total, ticket) => total + (ticket.amount ?? 0), 0),
  },
];

const base = {
  columns,
  rows: tickets,
  getRowKey: (ticket: Ticket) => ticket.id,
  caption: "Tickets",
};

function subjects(): (string | null)[] {
  return screen.getAllByRole("rowheader").map((cell) => cell.textContent);
}

describe("DataTable", () => {
  it("renders a named table with a header, a row per item and a footer", () => {
    render(<DataTable {...base} />);
    const table = screen.getByRole("table", { name: "Tickets" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Subject", "Amount"]);
    expect(subjects()).toEqual(["Refund", "booking change", "Account", "Payout 10"]);
    expect(within(table).getByText("159")).toBeInTheDocument();
  });

  it("sorts ascending, then descending, then not at all, and announces the order", async () => {
    render(<DataTable {...base} />);
    const header = screen.getByRole("columnheader", { name: /Subject/ });
    const button = within(header).getByRole("button");
    expect(header).toHaveAttribute("aria-sort", "none");

    await userEvent.click(button);
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(subjects()).toEqual(["Account", "booking change", "Payout 10", "Refund"]);

    await userEvent.click(button);
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(subjects()).toEqual(["Refund", "Payout 10", "booking change", "Account"]);

    await userEvent.click(button);
    expect(header).toHaveAttribute("aria-sort", "none");
    expect(subjects()).toEqual(["Refund", "booking change", "Account", "Payout 10"]);
  });

  it("sorts numbers as numbers and keeps empty values last in both directions", async () => {
    render(<DataTable {...base} />);
    const button = within(screen.getByRole("columnheader", { name: /Amount/ })).getByRole("button");

    await userEvent.click(button);
    expect(subjects()).toEqual(["Payout 10", "Refund", "booking change", "Account"]);
    await userEvent.click(button);
    expect(subjects()).toEqual(["booking change", "Refund", "Payout 10", "Account"]);
  });

  it("leaves the order alone with manualSorting and only reports the choice", async () => {
    const onSortChange = vi.fn();
    render(<DataTable {...base} manualSorting onSortChange={onSortChange} />);
    await userEvent.click(
      within(screen.getByRole("columnheader", { name: /Subject/ })).getByRole("button"),
    );
    expect(onSortChange).toHaveBeenCalledWith({ column: "subject", direction: "asc" });
    expect(subjects()).toEqual(["Refund", "booking change", "Account", "Payout 10"]);
  });

  it("selects rows one at a time and all at once", async () => {
    const onSelectedKeysChange = vi.fn();
    render(
      <DataTable
        {...base}
        selectable
        isRowSelectable={(ticket) => ticket.id !== 3}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const all = screen.getByRole("checkbox", { name: "Select all rows" });

    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 2" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith([2]);
    expect(all).toHaveAttribute("data-state", "indeterminate");
    expect(screen.getByRole("checkbox", { name: "Select row 3" })).toBeDisabled();

    await userEvent.click(all);
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith([1, 2, 4]);
    expect(all).toBeChecked();

    await userEvent.click(all);
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith([]);
  });

  it("shows placeholder rows while loading with nothing to show", () => {
    render(<DataTable {...base} rows={[]} loading loadingRows={3} />);
    expect(screen.getByRole("table", { name: "Tickets" })).toHaveAttribute("aria-busy", "true");
    const body = screen.getAllByRole("rowgroup")[1];
    expect(body).toBeDefined();
    expect(within(body ?? document.body).getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByText("Nothing to show.")).not.toBeInTheDocument();
  });

  it("keeps the rows and shows a progress bar while loading over existing rows", () => {
    render(<DataTable {...base} loading />);
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();
    expect(subjects()).toHaveLength(4);
  });

  it("shows the empty content when there are no rows", () => {
    render(<DataTable {...base} rows={[]} empty={<p>No tickets match.</p>} />);
    expect(screen.getByText("No tickets match.")).toBeInTheDocument();
  });

  it("leaves out hidden columns and passes extra props to rows", () => {
    render(
      <DataTable
        {...base}
        columns={[
          ...columns,
          { id: "id", header: "ID", cell: (ticket) => ticket.id, hidden: true },
        ]}
        rowProps={(ticket) => ({ "data-ticket": ticket.id, className: "cursor-pointer" }) as never}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Refund/ });
    expect(row).toHaveAttribute("data-ticket", "1");
    expect(row).toHaveClass("cursor-pointer");
  });

  describe("with reordering", () => {
    const unsorted = columns.map((column) => ({ ...column, sortable: false }));

    it("gives every row a named drag handle, in the table and the list", () => {
      render(
        <DataTable
          {...base}
          columns={unsorted}
          reorder={{ label: (ticket) => ticket.subject, onReorder: vi.fn() }}
          renderMobileRow={(ticket) => ticket.subject}
        />,
      );
      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("button", { name: /^Reorder / })).toHaveLength(4);
      const list = screen.getByRole("list");
      expect(within(list).getByRole("button", { name: "Reorder Refund" })).toHaveAttribute(
        "aria-roledescription",
        "sortable",
      );
    });

    it("moves a row with the keyboard and reports the new order", async () => {
      // jsdom lays nothing out, so each row is given a place 40px below the one before it.
      const rect = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          const row = this.closest("tr");
          const top = row ? [...(row.parentElement?.children ?? [])].indexOf(row) * 40 : 0;
          return DOMRect.fromRect({ x: 0, y: top, width: 400, height: 40 });
        });
      const onReorder = vi.fn();
      const user = userEvent.setup();
      render(
        <DataTable
          {...base}
          columns={unsorted}
          reorder={{ label: (ticket) => ticket.subject, onReorder }}
        />,
      );

      screen.getByRole("button", { name: "Reorder Refund" }).focus();
      await user.keyboard(" ");
      await user.keyboard("{ArrowDown}");
      await user.keyboard(" ");

      expect(onReorder).toHaveBeenCalledWith([2, 1, 3, 4]);
      rect.mockRestore();
    });
  });

  describe("with a mobile renderer", () => {
    // jsdom applies no CSS, so both the table and the list are in the page; the classes decide
    // which one a screen shows.
    it("draws a list item per row beside the table, each shown below md only", () => {
      render(
        <DataTable
          {...base}
          renderMobileRow={(ticket) => <a href={`/tickets/${ticket.id}`}>{ticket.subject}</a>}
        />,
      );
      const list = screen.getByRole("list", { name: "Tickets" });
      expect(within(list).getAllByRole("listitem")).toHaveLength(4);
      expect(within(list).getByRole("link", { name: "Refund" })).toHaveAttribute(
        "href",
        "/tickets/1",
      );
      expect(list.parentElement).toHaveClass("md:hidden");
      expect(screen.getByRole("table").parentElement).toHaveClass("max-md:hidden");
    });

    it("keeps the rows in the same order as the sorted table", async () => {
      const user = userEvent.setup();
      render(<DataTable {...base} renderMobileRow={(ticket) => ticket.subject} />);

      await user.click(screen.getByRole("button", { name: /Subject/ }));

      const items = within(screen.getByRole("list")).getAllByRole("listitem");
      expect(items.map((item) => item.textContent)).toEqual(subjects());
    });

    it("shows the empty content once, for the table and the list alike", () => {
      render(
        <DataTable
          {...base}
          rows={[]}
          empty={<p>No tickets match.</p>}
          renderMobileRow={(ticket) => ticket.subject}
        />,
      );
      expect(screen.getAllByText("No tickets match.")).toHaveLength(1);
    });

    it("lets rows be selected from the list", async () => {
      const onSelectedKeysChange = vi.fn();
      const user = userEvent.setup();
      render(
        <DataTable
          {...base}
          selectable
          onSelectedKeysChange={onSelectedKeysChange}
          renderMobileRow={(ticket) => ticket.subject}
        />,
      );

      const list = screen.getByRole("list");
      await user.click(within(list).getByRole("checkbox", { name: "Select row 2" }));

      expect(onSelectedKeysChange).toHaveBeenCalledWith([2]);
    });
  });
});

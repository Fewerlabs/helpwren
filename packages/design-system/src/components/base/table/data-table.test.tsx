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
});

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DataTableColumn } from "../base/table/data-table";
import type { QueryListPage, QueryListRequest } from "./query-list";
import { QueryTable, type QueryTableProps } from "./query-table";
import { QueryProvider } from "./test-utils";

interface Ticket {
  id: number;
  subject: string;
}

const tickets: Ticket[] = Array.from({ length: 60 }, (_, index) => ({
  id: index + 1,
  subject: `Ticket ${index + 1}`,
}));

const columns: DataTableColumn<Ticket>[] = [
  { id: "subject", header: "Subject", rowHeader: true, cell: (ticket) => ticket.subject },
];

function paged(rows: readonly Ticket[] = tickets) {
  return vi.fn(({ page, pageSize = 25 }: QueryListRequest<unknown>) => {
    const start = (page - 1) * pageSize;
    return Promise.resolve<QueryListPage<Ticket>>({
      items: rows.slice(start, start + pageSize),
      total: rows.length,
    });
  });
}

function Table(props: Partial<QueryTableProps<Ticket>>) {
  return (
    <QueryProvider>
      <QueryTable<Ticket>
        queryKey={["tickets"]}
        queryFn={paged()}
        pageSize={25}
        caption="Tickets"
        columns={columns}
        getRowKey={(ticket) => ticket.id}
        noun={{ one: "ticket", other: "tickets" }}
        messages={{ pagination: "Tickets pages" }}
        {...props}
      />
    </QueryProvider>
  );
}

/** Makes every media query match, as on a phone. */
function narrowScreen() {
  vi.stubGlobal("matchMedia", (query: string) =>
    Object.assign(new EventTarget(), { matches: true, media: query, onchange: null }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("QueryTable", () => {
  it("shows the app's loader on the first load, then the rows and the footer", async () => {
    render(<Table />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    expect(await screen.findByText("Ticket 1")).toBeInTheDocument();
    const footer = screen.getByRole("navigation", { name: "Tickets pages" });
    expect(footer).toHaveTextContent("1–25 of 60");
    expect(within(footer).getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("shows placeholder rows in the table's shape when asked for a skeleton", async () => {
    render(<Table placeholder="skeleton" />);
    const table = screen.getByRole("table", { name: "Tickets" });
    expect(table).toHaveAttribute("aria-busy", "true");
    expect(within(table).queryByText("Ticket 1")).not.toBeInTheDocument();

    expect(await screen.findByText("Ticket 1")).toBeInTheDocument();
    const footer = screen.getByRole("navigation", { name: "Tickets pages" });
    expect(footer).toHaveTextContent("1–25 of 60");
    expect(within(footer).getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("draws the toolbar through every state, with the list's total", async () => {
    render(
      <Table
        toolbar={({ total }) => <h2>Tickets {total === undefined ? "" : `(${String(total)})`}</h2>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Tickets" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Tickets (60)" })).toBeInTheDocument();
  });

  it("shows an error with Try again, which loads the table", async () => {
    const queryFn = paged();
    queryFn.mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<Table queryFn={queryFn} messages={{ error: "Tickets could not be loaded." }} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Tickets could not be loaded.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Ticket 1")).toBeInTheDocument();
  });

  it("shows the caller's empty state, and no footer", async () => {
    render(<Table queryFn={paged([])} empty={<p>No tickets yet</p>} />);
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("says when a search or filter leaves nothing, with its own default", async () => {
    render(<Table queryFn={paged([])} empty={<p>No tickets yet</p>} filtered />);
    expect(await screen.findByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try a different search or fewer filters.")).toBeInTheDocument();
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
  });

  it("takes its own filtered empty state", async () => {
    render(<Table queryFn={paged([])} filtered emptyFiltered={<p>No tickets match</p>} />);
    expect(await screen.findByText("No tickets match")).toBeInTheDocument();
  });

  it("pages with the footer and keeps the rows on screen while the next page loads", async () => {
    const user = userEvent.setup();
    render(<Table />);
    await screen.findByText("Ticket 1");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Ticket 26")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Tickets pages" })).toHaveTextContent(
      "26–50 of 60",
    );
  });

  it("hides the parts of the footer it is asked to", async () => {
    const { unmount } = render(<Table showSummary={false} pageSizeOptions={false} />);
    const footer = await screen.findByRole("navigation", { name: "Tickets pages" });
    expect(footer).not.toHaveTextContent("1–25 of 60");
    expect(within(footer).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Next page" })).toBeInTheDocument();
    unmount();

    render(<Table showPagination={false} />);
    await screen.findByText("Ticket 1");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("changes the rows per page, goes back to page 1 and remembers the choice", async () => {
    const queryFn = paged();
    const user = userEvent.setup();
    const { unmount } = render(<Table queryFn={queryFn} pageSizeKey="tickets" />);
    await screen.findByText("Ticket 1");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Ticket 26");

    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(await screen.findByRole("option", { name: "50" }));
    expect(await screen.findByText("Ticket 50")).toBeInTheDocument();
    expect(screen.getByText("Ticket 1")).toBeInTheDocument();
    expect(queryFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 50 }));
    unmount();

    // A fresh table for the same key opens at the size chosen before.
    render(<Table queryFn={queryFn} pageSizeKey="tickets" />);
    expect(await screen.findByText("Ticket 50")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveTextContent("50");
  });

  it("loads more under the rows on a phone, and starts again when the list changes", async () => {
    narrowScreen();
    const user = userEvent.setup();
    function Filtered() {
      const [half, setHalf] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setHalf(true);
            }}
          >
            Filter
          </button>
          <Table
            queryKey={["tickets", half]}
            queryFn={paged(half ? tickets.slice(0, 30) : tickets)}
            renderMobileRow={(ticket) => <span>{ticket.subject} on a phone</span>}
          />
        </>
      );
    }
    render(<Filtered />);
    const list = await screen.findByRole("list", { name: "Tickets" });
    expect(await within(list).findByText("Ticket 1 on a phone")).toBeInTheDocument();
    const footer = screen.getByRole("navigation", { name: "Tickets pages" });
    expect(footer).toHaveTextContent("Showing 25 of 60");
    expect(within(footer).queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();

    await user.click(within(footer).getByRole("button", { name: "Load more" }));
    expect(await within(list).findByText("Ticket 50 on a phone")).toBeInTheDocument();
    expect(within(list).getByText("Ticket 1 on a phone")).toBeInTheDocument();
    expect(footer).toHaveTextContent("Showing 50 of 60");

    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(await screen.findByText("Showing 25 of 30")).toBeInTheDocument();
    expect(within(list).queryByText("Ticket 26 on a phone")).not.toBeInTheDocument();
  });

  it("keeps a dropped row where it was put until the save settles", async () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const row = this.closest("tr");
        const top = row ? [...(row.parentElement?.children ?? [])].indexOf(row) * 40 : 0;
        return DOMRect.fromRect({ x: 0, y: top, width: 400, height: 40 });
      });
    let finish: () => void = () => undefined;
    const onReorder = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <Table
        queryFn={paged(tickets.slice(0, 3))}
        pagination="none"
        reorder={{ label: (ticket) => ticket.subject, onReorder }}
      />,
    );
    await screen.findByText("Ticket 1");

    screen.getByRole("button", { name: "Reorder Ticket 1" }).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");

    expect(onReorder).toHaveBeenCalledWith([2, 1, 3]);
    const order = () =>
      within(screen.getByRole("table"))
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent);
    expect(order()).toEqual(["Ticket 2", "Ticket 1", "Ticket 3"]);
    // The server never saved it here, so once the save settles the rows go back.
    await act(async () => {
      finish();
      await Promise.resolve();
    });
    expect(order()).toEqual(["Ticket 1", "Ticket 2", "Ticket 3"]);
    rect.mockRestore();
  });

  it.each([false, true])(
    "ticks rows by name and acts on them from a bar (rows draggable: %s)",
    async (draggable) => {
      const archive = vi.fn();
      function Ticked() {
        const [keys, setKeys] = useState<(string | number)[]>([]);
        return (
          <Table
            queryFn={paged(tickets.slice(0, 3))}
            {...(draggable
              ? { reorder: { label: (ticket: Ticket) => ticket.subject, onReorder: vi.fn() } }
              : {})}
            selection={{
              label: (ticket) => ticket.subject,
              selectedKeys: keys,
              onSelectedKeysChange: setKeys,
              actions: [
                {
                  label: "Archive",
                  onSelect: () => {
                    archive(keys);
                  },
                },
              ],
            }}
          />
        );
      }
      render(<Ticked />);
      const rows = within(await screen.findByRole("table"));
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

      await userEvent.click(rows.getByRole("checkbox", { name: "Select Ticket 2" }));
      await userEvent.click(rows.getByRole("checkbox", { name: "Select Ticket 3" }));
      expect(screen.getByRole("toolbar", { name: "Selected rows" })).toHaveTextContent(
        "2 tickets selected",
      );
      await userEvent.click(screen.getByRole("button", { name: "Archive" }));
      expect(archive).toHaveBeenCalledWith([2, 3]);

      await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    },
  );
});

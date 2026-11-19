import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "../base/tooltip/tooltip";
import { QueryList, type QueryListPage, type QueryListRequest } from "./query-list";
import { QueryProvider } from "./test-utils";

interface Ticket {
  id: number;
  subject: string;
}

const tickets: Ticket[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  subject: `Ticket ${index + 1}`,
}));

function pagedBy(size: number) {
  return vi.fn(({ page }: QueryListRequest<number>): Promise<QueryListPage<Ticket, number>> => {
    const start = (page - 1) * size;
    return Promise.resolve({
      items: tickets.slice(start, start + size),
      nextCursor: start + size < tickets.length ? start + size : undefined,
      total: tickets.length,
    });
  });
}

const item = {
  renderItem: (ticket: Ticket) => ticket.subject,
  getItemKey: (ticket: Ticket) => ticket.id,
};

let reachEndOfList: () => void = () => undefined;
beforeEach(() => {
  class ObserverStub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly scrollMargin = "";
    readonly thresholds = [];
    constructor(callback: IntersectionObserverCallback) {
      reachEndOfList = () => {
        callback([{ isIntersecting: true } as IntersectionObserverEntry], this);
      };
    }
    observe(): void {
      // Nothing to observe without layout.
    }
    unobserve(): void {
      // See observe().
    }
    disconnect(): void {
      reachEndOfList = () => undefined;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function scrollToEnd() {
  await act(async () => {
    await Promise.resolve();
  });
  act(() => {
    reachEndOfList();
  });
}

describe("QueryList", () => {
  it("shows a loading state, then the items", async () => {
    render(
      <QueryProvider>
        <QueryList queryKey={["tickets"]} queryFn={pagedBy(10)} aria-label="Tickets" {...item} />
      </QueryProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();

    expect(await screen.findByText("Ticket 1")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no items", async () => {
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "none"]}
          queryFn={() => Promise.resolve({ items: [] })}
          messages={{ empty: "No tickets yet.", emptyDescription: "New ones appear here." }}
          {...item}
        />
      </QueryProvider>,
    );
    expect(await screen.findByText("No tickets yet.")).toBeInTheDocument();
    expect(screen.getByText("New ones appear here.")).toBeInTheDocument();
  });

  it("shows an error with a retry that loads the list", async () => {
    const queryFn = vi
      .fn<(request: QueryListRequest<number>) => Promise<QueryListPage<Ticket, number>>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ items: tickets.slice(0, 2) });
    render(
      <QueryProvider>
        <QueryList queryKey={["tickets", "error"]} queryFn={queryFn} {...item} />
      </QueryProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("This could not be loaded.");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Ticket 1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("appends pages as the end of the list is reached, until the last page", async () => {
    const queryFn = pagedBy(10);
    render(
      <QueryProvider>
        <QueryList queryKey={["tickets", "infinite"]} queryFn={queryFn} {...item} />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 10");

    await scrollToEnd();
    expect(await screen.findByText("Ticket 20")).toBeInTheDocument();
    expect(queryFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, cursor: 10 }));

    await scrollToEnd();
    expect(await screen.findByText("Ticket 25")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(25);

    await scrollToEnd();
    expect(queryFn).toHaveBeenCalledTimes(3);
  });

  it("shows a spinner at the bottom while the next page loads, then marks the end", async () => {
    let release: () => void = () => undefined;
    const queryFn = vi.fn(async ({ page }: QueryListRequest<number>) => {
      if (page === 2) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      const start = (page - 1) * 20;
      return {
        items: tickets.slice(start, start + 20),
        nextCursor: start + 20 < tickets.length ? start + 20 : undefined,
      };
    });
    const { container } = render(
      <QueryProvider>
        <QueryList queryKey={["tickets", "end"]} queryFn={queryFn} {...item} />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 20");
    expect(screen.queryByText("You've reached the end.")).not.toBeInTheDocument();

    await scrollToEnd();
    expect(await screen.findByText("Loading more")).toBeInTheDocument();
    // The top bar is for refreshes; a next page loads at the bottom.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    act(() => {
      release();
    });
    expect(await screen.findByText("Ticket 25")).toBeInTheDocument();
    expect(screen.queryByText("Loading more")).not.toBeInTheDocument();
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='query-list-end'] [data-slot='wren']"),
    ).not.toBeNull();
  });

  it("does not mark the end of a list that fits in one page, and lets the marker be replaced", async () => {
    const { unmount } = render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "short"]}
          queryFn={() => Promise.resolve({ items: tickets.slice(0, 3) })}
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 3");
    expect(screen.queryByText("You've reached the end.")).not.toBeInTheDocument();
    unmount();

    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "custom-end"]}
          queryFn={pagedBy(20)}
          renderEnd={() => <p>No more tickets</p>}
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 20");
    await scrollToEnd();
    expect(await screen.findByText("No more tickets")).toBeInTheDocument();
  });

  it("can load more with a button instead of on scroll", async () => {
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "button"]}
          queryFn={pagedBy(20)}
          loadMoreOn="button"
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 20");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Ticket 25")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("pages with previous and next, keeping the current page on screen while the next loads", async () => {
    let release: () => void = () => undefined;
    const queryFn = vi.fn(async ({ page }: QueryListRequest<number>) => {
      if (page === 2) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      const start = (page - 1) * 10;
      return { items: tickets.slice(start, start + 10), total: tickets.length };
    });
    const onPageChange = vi.fn();
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "pages"]}
          queryFn={queryFn}
          pagination="pages"
          pageSize={10}
          onPageChange={onPageChange}
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 1");
    expect(screen.getByText("1–10 of 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
    // Page 1 stays visible, with the progress bar, until page 2 arrives.
    expect(screen.getByText("Ticket 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();

    act(() => {
      release();
    });
    expect(await screen.findByText("Ticket 11")).toBeInTheDocument();
    expect(screen.queryByText("Ticket 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("11–20 of 25")).toBeInTheDocument();
  });

  it("serves a page it has already loaded from the cache", async () => {
    const queryFn = pagedBy(10);
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "cache"]}
          queryFn={queryFn}
          pagination="pages"
          pageSize={10}
          staleTime={60_000}
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 1");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Ticket 11");
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));

    expect(await screen.findByText("Ticket 1")).toBeInTheDocument();
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("shows the footer with the count even when everything fits on one page", async () => {
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "one-page"]}
          queryFn={() => Promise.resolve({ items: tickets.slice(0, 4), total: 4 })}
          pagination="pages"
          pageSize={10}
          noun={{ one: "ticket", other: "tickets" }}
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 1");
    const footer = screen.getByRole("navigation", { name: "Pagination" });
    expect(footer).toHaveTextContent("4 tickets");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("goes back to the first page when the query key changes", async () => {
    const queryFn = pagedBy(10);
    const { rerender } = render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "a"]}
          queryFn={queryFn}
          pagination="pages"
          pageSize={10}
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 1");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Ticket 11");

    rerender(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "b"]}
          queryFn={queryFn}
          pagination="pages"
          pageSize={10}
          {...item}
        />
      </QueryProvider>,
    );

    expect(await screen.findByText("1–10 of 25")).toBeInTheDocument();
    expect(queryFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });

  it("falls back to the last page when the list shrinks under the one on screen", async () => {
    let count = 25;
    const queryFn = vi.fn(({ page }: QueryListRequest<number>) => {
      const start = (page - 1) * 10;
      return Promise.resolve({
        items: tickets.slice(0, count).slice(start, start + 10),
        total: count,
      });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <QueryList
            queryKey={["tickets", "shrink"]}
            queryFn={queryFn}
            pagination="pages"
            pageSize={10}
            {...item}
          />
        </TooltipProvider>
      </QueryClientProvider>,
    );
    await screen.findByText("Ticket 1");
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByText("21–25 of 25")).toBeInTheDocument();

    count = 12;
    await act(() => client.invalidateQueries());

    expect(await screen.findByText("11–12 of 12")).toBeInTheDocument();
    expect(screen.getByText("Ticket 12")).toBeInTheDocument();
  });

  it("shows no paging in none mode", async () => {
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "plain"]}
          queryFn={pagedBy(10)}
          pagination="none"
          {...item}
        />
      </QueryProvider>,
    );
    await screen.findByText("Ticket 1");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("uses custom loading, empty, error and pagination renderers", async () => {
    render(
      <QueryProvider>
        <QueryList
          queryKey={["tickets", "custom"]}
          queryFn={pagedBy(10)}
          pagination="pages"
          pageSize={10}
          renderLoading={() => <p>Fetching tickets</p>}
          renderPagination={({ page, setPage }) => (
            <button
              type="button"
              onClick={() => {
                setPage(page + 1);
              }}
            >
              Go to {page + 1}
            </button>
          )}
          {...item}
        />
      </QueryProvider>,
    );
    expect(screen.getByText("Fetching tickets")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Go to 2" }));
    expect(await screen.findByText("Ticket 11")).toBeInTheDocument();
  });

  it("hands everything to children when it is a function", async () => {
    render(
      <QueryProvider>
        <QueryList<Ticket, number> queryKey={["tickets", "headless"]} queryFn={pagedBy(10)}>
          {({ status, items, total, hasMore }) => (
            <p>
              {status}: {items.length} of {total ?? "?"}, more: {String(hasMore)}
            </p>
          )}
        </QueryList>
      </QueryProvider>,
    );
    expect(screen.getByText("loading: 0 of ?, more: false")).toBeInTheDocument();
    expect(await screen.findByText("ready: 10 of 25, more: true")).toBeInTheDocument();
  });

  it("does not fetch while disabled", () => {
    const queryFn = pagedBy(10);
    render(
      <QueryProvider>
        <QueryList queryKey={["tickets", "off"]} queryFn={queryFn} enabled={false} {...item} />
      </QueryProvider>,
    );
    expect(queryFn).not.toHaveBeenCalled();
  });
});

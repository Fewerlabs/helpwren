import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "../tooltip/tooltip";
import { loadMoreSummary, Pagination, paginationSummary, type PaginationState } from "./pagination";

const contacts = { one: "contact", other: "contacts" };

function state(overrides: Partial<PaginationState>): PaginationState {
  return {
    page: 1,
    pageSize: 25,
    total: 132,
    itemCount: 25,
    hasPrevious: false,
    hasNext: true,
    setPage: () => undefined,
    ...overrides,
  };
}

describe("paginationSummary", () => {
  it("gives the range and the total across pages", () => {
    expect(paginationSummary(state({}))).toBe("1–25 of 132");
    expect(
      paginationSummary(state({ page: 6, itemCount: 7, hasPrevious: true, hasNext: false })),
    ).toBe("126–132 of 132");
  });

  it("gives the count with the noun when everything fits on one page", () => {
    const onePage = { hasNext: false, total: 4, itemCount: 4 };
    expect(paginationSummary(state(onePage), contacts)).toBe("4 contacts");
    expect(paginationSummary(state({ ...onePage, total: 1, itemCount: 1 }), contacts)).toBe(
      "1 contact",
    );
    expect(paginationSummary(state(onePage))).toBe("4 items");
  });

  it("leaves out the total when the server does not know it", () => {
    expect(paginationSummary(state({ page: 2, total: undefined, hasPrevious: true }))).toBe(
      "26–50",
    );
    expect(paginationSummary(state({ hasNext: false, total: undefined, itemCount: 9 }))).toBe(
      "9 items",
    );
  });

  it("groups thousands", () => {
    expect(paginationSummary(state({ page: 41, total: 1320, hasPrevious: true }))).toBe(
      "1,001–1,025 of 1,320",
    );
  });
});

describe("Pagination", () => {
  it("moves a page at a time and disables the end it is at", async () => {
    const setPage = vi.fn();
    render(
      <TooltipProvider>
        <Pagination pagination={state({ setPage })} noun={contacts} />
      </TooltipProvider>,
    );
    const footer = screen.getByRole("navigation", { name: "Pagination" });
    expect(footer).toHaveTextContent("1–25 of 132");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("shows with a single page, both buttons disabled", () => {
    render(
      <TooltipProvider>
        <Pagination
          pagination={state({ hasNext: false, total: 4, itemCount: 4 })}
          noun={contacts}
          messages={{ label: "Contacts pages" }}
        />
      </TooltipProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Contacts pages" })).toHaveTextContent(
      "4 contacts",
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("hides when there is nothing to count", () => {
    render(
      <TooltipProvider>
        <Pagination pagination={state({ hasNext: false, total: 0, itemCount: 0 })} />
      </TooltipProvider>,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("offers a rows-per-page picker when it can change the size", async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Pagination pagination={state({})} onPageSizeChange={onPageSizeChange} />
      </TooltipProvider>,
    );
    const picker = screen.getByRole("combobox", { name: "Rows per page" });
    expect(picker).toHaveTextContent("25");
    await user.click(picker);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "10",
      "25",
      "50",
      "100",
    ]);
    await user.click(screen.getByRole("option", { name: "100" }));
    expect(onPageSizeChange).toHaveBeenCalledWith(100);
  });

  it("leaves out the picker, the summary or the controls when asked", () => {
    render(
      <TooltipProvider>
        <Pagination
          pagination={state({})}
          onPageSizeChange={vi.fn()}
          pageSizeOptions={false}
          showSummary={false}
        />
      </TooltipProvider>,
    );
    const footer = screen.getByRole("navigation");
    expect(within(footer).queryByRole("combobox")).not.toBeInTheDocument();
    expect(footer).not.toHaveTextContent("1–25 of 132");
    expect(within(footer).getByRole("button", { name: "Next page" })).toBeInTheDocument();
  });

  it("draws nothing when every part is turned off", () => {
    render(
      <TooltipProvider>
        <Pagination pagination={state({})} showSummary={false} showControls={false} />
      </TooltipProvider>,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("loads more instead of paging, saying how many are shown", async () => {
    const onLoadMore = vi.fn();
    render(
      <TooltipProvider>
        <Pagination
          pagination={state({ itemCount: 50 })}
          mode="load-more"
          onLoadMore={onLoadMore}
        />
      </TooltipProvider>,
    );
    expect(screen.getByRole("navigation")).toHaveTextContent("Showing 50 of 132");
    expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});

describe("loadMoreSummary", () => {
  it("counts what is shown, then everything once all of it is", () => {
    expect(loadMoreSummary(state({ itemCount: 50 }))).toBe("Showing 50 of 132");
    expect(loadMoreSummary(state({ itemCount: 50, total: undefined }))).toBe("Showing 50");
    expect(
      loadMoreSummary(state({ itemCount: 132, hasNext: false }), {
        one: "contact",
        other: "contacts",
      }),
    ).toBe("132 contacts");
  });
});

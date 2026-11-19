import { act, renderHook } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useListParams, type ListParamsOptions } from "./use-list-params";

// Next.js follows the browser's history; here the address is read straight from it, and
// every push or replace tells the hook to read again.
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        subscribe,
        () => window.location.search,
        () => "",
      ),
    ),
}));

const pushState = window.history.pushState.bind(window.history);
const replaceState = window.history.replaceState.bind(window.history);
let pushes = 0;
beforeEach(() => {
  pushes = 0;
  window.history.replaceState(null, "", "/list");
  vi.spyOn(window.history, "pushState").mockImplementation((...args) => {
    pushes += 1;
    pushState(...args);
    for (const listener of listeners) listener();
  });
  vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
    replaceState(...args);
    for (const listener of listeners) listener();
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.localStorage.clear();
});

function open(url: string) {
  replaceState(null, "", url);
}

const options: ListParamsOptions<{ show: "everyone" | "guests" }> = {
  filters: ["status", "country"],
  sortColumns: ["name"],
  params: { show: { values: ["everyone", "guests"], default: "everyone" } },
};

describe("useListParams", () => {
  it("gives the defaults for a plain address", () => {
    const { result } = renderHook(() => useListParams(options));
    expect(result.current).toMatchObject({
      page: 1,
      pageSize: 25,
      search: "",
      query: "",
      filters: {},
      sort: null,
      params: { show: "everyone" },
      narrowed: false,
    });
  });

  it("reads every value from the address", () => {
    open("/list?page=3&size=50&q=refund&status=open&status=pending&sort=-name&show=guests");
    const { result } = renderHook(() => useListParams(options));
    expect(result.current).toMatchObject({
      page: 3,
      pageSize: 50,
      query: "refund",
      filters: { status: ["open", "pending"] },
      sort: { column: "name", direction: "desc" },
      params: { show: "guests" },
      narrowed: true,
    });
  });

  it("falls back to the defaults for values that make no sense", () => {
    open("/list?page=-2&size=33&sort=secret&show=admins&tags=x");
    const { result } = renderHook(() => useListParams(options));
    expect(result.current).toMatchObject({
      page: 1,
      pageSize: 25,
      sort: null,
      params: { show: "everyone" },
      filters: {},
    });
    open("/list?page=2.5");
    expect(renderHook(() => useListParams(options)).result.current.page).toBe(1);
  });

  it("leaves defaults out of the address", () => {
    const { result } = renderHook(() => useListParams(options));
    act(() => {
      result.current.setPage(2);
    });
    expect(window.location.search).toBe("?page=2");
    act(() => {
      result.current.setPage(1);
    });
    expect(window.location.search).toBe("");
    act(() => {
      result.current.setParam("show", "guests");
    });
    act(() => {
      result.current.setParam("show", "everyone");
    });
    act(() => {
      result.current.setPageSize(25);
    });
    expect(window.location.search).toBe("");
  });

  it("goes back to page 1 when the filters, size or other values change, not the sort's page", () => {
    open("/list?page=4");
    const { result } = renderHook(() => useListParams(options));
    act(() => {
      result.current.setFilters({ status: ["open"] });
    });
    expect(window.location.search).toBe("?status=open");
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.setPageSize(50);
    });
    expect(window.location.search).toBe("?status=open&size=50");

    act(() => {
      result.current.setPage(2);
    });
    act(() => {
      result.current.setParam("show", "guests");
    });
    expect(new URLSearchParams(window.location.search).get("page")).toBeNull();
  });

  it("writes the search once typing pauses, replacing the entry, and resets the page", () => {
    vi.useFakeTimers();
    open("/list?page=2");
    const { result } = renderHook(() => useListParams(options));
    act(() => {
      result.current.setSearch("ref");
    });
    act(() => {
      result.current.setSearch("refund ");
    });
    expect(result.current.search).toBe("refund ");
    expect(result.current.query).toBe("");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(window.location.search).toBe("?q=refund");
    expect(result.current).toMatchObject({ query: "refund", search: "refund ", page: 1 });
    expect(pushes).toBe(0);
  });

  it("follows the address when it changes some other way, such as Back", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useListParams(options));
    act(() => {
      result.current.setSearch("refund");
      vi.advanceTimersByTime(250);
    });
    act(() => {
      window.history.replaceState(null, "", "/list?q=billing");
    });
    expect(result.current.search).toBe("billing");
  });

  it("keeps two lists apart with a prefix", () => {
    open("/list?page=2&visitors.page=5&visitors.status=open");
    const first = renderHook(() => useListParams(options)).result;
    const second = renderHook(() => useListParams({ ...options, prefix: "visitors" })).result;
    expect(first.current.page).toBe(2);
    expect(first.current.filters).toEqual({});
    expect(second.current.page).toBe(5);
    expect(second.current.filters).toEqual({ status: ["open"] });

    act(() => {
      second.current.setFilters({ country: ["GB"] });
    });
    expect(window.location.search).toBe("?page=2&visitors.country=GB");
  });

  it("keeps a filter just added to the bar, with no values yet, without narrowing", () => {
    const { result } = renderHook(() => useListParams(options));
    act(() => {
      result.current.setFilters({ status: [] });
    });
    expect(window.location.search).toBe("?status=");
    expect(result.current.filters).toEqual({ status: [] });
    expect(result.current.narrowed).toBe(false);
    act(() => {
      result.current.setFilters({});
    });
    expect(window.location.search).toBe("");
  });

  it("uses the size this browser chose last as its default, and remembers a new one", () => {
    window.localStorage.setItem("helpwren:page-size:contacts", "50");
    const { result } = renderHook(() => useListParams({ pageSizeKey: "contacts" }));
    expect(result.current.pageSize).toBe(50);
    act(() => {
      result.current.setPageSize(100);
    });
    expect(window.localStorage.getItem("helpwren:page-size:contacts")).toBe("100");
    expect(window.location.search).toBe("?size=100");
  });

  it("adds a history entry for each change, so Back undoes it", () => {
    const { result } = renderHook(() => useListParams(options));
    act(() => {
      result.current.setFilters({ status: ["open"] });
    });
    act(() => {
      result.current.setPage(2);
    });
    expect(pushes).toBe(2);
    // The same value again is not a change, and adds nothing to step back over.
    act(() => {
      result.current.setPage(2);
    });
    expect(pushes).toBe(2);
  });
});

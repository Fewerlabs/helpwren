"use client";

import {
  defaultPageSizeOptions,
  readPageSize,
  rememberPageSize,
  type DataTableSort,
  type FilterValue,
} from "@helpwren/design-system";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** One more value a list keeps in the address, chosen from a fixed set, such as a segment. */
export interface ListParam<Value extends string> {
  values: readonly Value[];
  default: Value;
}

export interface ListParamsOptions<Params extends Record<string, string> = Record<string, string>> {
  /**
   * Put before every key with a dot, so two lists on one page keep apart: `tickets` makes
   * `tickets.page=2&tickets.q=refund`. Leave it out for a page with one list.
   */
  prefix?: string;
  /** The ids of the filter bar's filters. Only these are read from the address. */
  filters?: readonly string[];
  /** The columns the list can be sorted by. A sort by anything else is ignored. */
  sortColumns?: readonly string[];
  defaultSort?: DataTableSort | null;
  /** The rows per page when the address and this browser say nothing. Default 25. */
  pageSize?: number;
  /** The sizes the footer's picker offers. A size outside them in the address is ignored. */
  pageSizeOptions?: readonly number[];
  /**
   * Remembers the rows-per-page choice in this browser under this name, as `QueryList` does,
   * so it becomes this person's default when the address does not say.
   */
  pageSizeKey?: string;
  /** Other values the list keeps in the address, each from a fixed set, with its default. */
  params?: { [Key in keyof Params]: ListParam<Params[Key]> };
  /** How long typing has to pause before the search is written. Default 250ms. */
  searchDelayMs?: number;
}

export interface ListParams<Params extends Record<string, string>> {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  /** What is in the search field, as it is typed. */
  search: string;
  setSearch: (search: string) => void;
  /** The search the list is filtered by: what was typed, trimmed, once typing paused. */
  query: string;
  filters: FilterValue;
  setFilters: (filters: FilterValue) => void;
  sort: DataTableSort | null;
  setSort: (sort: DataTableSort | null) => void;
  params: Params;
  setParam: <Key extends keyof Params & string>(key: Key, value: Params[Key]) => void;
  /** True while a search or a filter narrows the list. */
  narrowed: boolean;
}

const DEFAULT_PAGE_SIZE = 25;

type Changes = Record<string, string | readonly string[] | null>;

function paramKey(prefix: string | undefined, key: string): string {
  return prefix ? `${prefix}.${key}` : key;
}

/** Writes changes into the address. Each is a new history entry unless `replace`. */
function write(
  prefix: string | undefined,
  changes: Changes,
  { replace = false, resetPage = true }: { replace?: boolean; resetPage?: boolean } = {},
) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    url.searchParams.delete(paramKey(prefix, key));
    for (const item of value === null ? [] : typeof value === "string" ? [value] : value) {
      url.searchParams.append(paramKey(prefix, key), item);
    }
  }
  if (resetPage) url.searchParams.delete(paramKey(prefix, "page"));
  // Nothing changed, so no entry is added that Back would have to step over.
  if (url.href === window.location.href) return;
  if (replace) {
    window.history.replaceState(null, "", url);
  } else {
    window.history.pushState(null, "", url);
  }
}

/**
 * Keeps a list's page, rows per page, search, filters, sort and any other declared values in
 * the address, so a reload, a shared link, and Back and Forward all show the same view.
 * Declare the options outside the component, so they are the same object every render.
 *
 * Defaults are left out, so a plain list has a plain address. A new search, filter, size or
 * other value starts again from page 1. Values that make no sense fall back to the defaults.
 * Each change is its own history entry, so Back undoes it, except typing in the search, which
 * replaces the entry so Back does not step through every letter.
 *
 * The address is written with the browser's history API, which Next.js follows: unlike
 * `router.replace`, the page asks the server for nothing, and the scroll position stays.
 *
 * The rows-per-page choice is both: in the address when it differs from 25, so a shared link
 * keeps it, and remembered in this browser under `pageSizeKey` as this person's default when
 * the address does not say.
 */
export function useListParams<Params extends Record<string, string> = Record<string, string>>(
  options: ListParamsOptions<Params> = {},
): ListParams<Params> {
  const {
    prefix,
    filters: filterIds = [],
    sortColumns = [],
    defaultSort = null,
    pageSize: fallbackSize = DEFAULT_PAGE_SIZE,
    pageSizeOptions = defaultPageSizeOptions,
    pageSizeKey,
    params: paramOptions,
    searchDelayMs = 250,
  } = options;
  const searchParams = useSearchParams();
  const read = (key: string) => searchParams.get(paramKey(prefix, key));
  const [defaultSize] = useState(
    () =>
      (pageSizeKey === undefined ? undefined : readPageSize(pageSizeKey, pageSizeOptions)) ??
      fallbackSize,
  );

  const pageValue = Number(read("page"));
  const page = Number.isInteger(pageValue) && pageValue >= 1 ? pageValue : 1;
  const sizeValue = Number(read("size"));
  const pageSize = pageSizeOptions.includes(sizeValue) ? sizeValue : defaultSize;
  const query = (read("q") ?? "").trim();

  const sortValue = read("sort") ?? "";
  const sortColumn = sortValue.replace(/^-/, "");
  const sort: DataTableSort | null = sortColumns.includes(sortColumn)
    ? { column: sortColumn, direction: sortValue.startsWith("-") ? "desc" : "asc" }
    : defaultSort;

  // A filter just added to the bar has no values yet but must stay on it while they are picked,
  // so it is kept as an empty key (`status=`), which narrows nothing.
  const filters: Record<string, string[]> = {};
  for (const id of filterIds) {
    const key = paramKey(prefix, id);
    if (searchParams.has(key)) {
      filters[id] = searchParams.getAll(key).filter((item) => item !== "");
    }
  }
  const filtering = Object.values(filters).some((chosen) => chosen.length > 0);

  const params: Record<string, string> = {};
  for (const [key, param] of Object.entries<ListParam<string>>(paramOptions ?? {})) {
    const raw = read(key);
    params[key] = raw !== null && param.values.includes(raw) ? raw : param.default;
  }

  // The field shows what is typed at once; the address follows once typing pauses. When the
  // address changes some other way, such as Back, the field follows it again.
  const [draft, setDraft] = useState<string | null>(null);
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    if (draft !== null && draft.trim() !== query) setDraft(null);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  return {
    page,
    setPage: (next) => {
      write(prefix, { page: next > 1 ? String(next) : null }, { resetPage: false });
    },
    pageSize,
    setPageSize: (next) => {
      if (pageSizeKey !== undefined) rememberPageSize(pageSizeKey, next);
      write(prefix, { size: next === DEFAULT_PAGE_SIZE ? null : String(next) });
    },
    search: draft ?? query,
    setSearch: (next) => {
      setDraft(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const trimmed = next.trim();
        write(prefix, { q: trimmed === "" ? null : trimmed }, { replace: true });
      }, searchDelayMs);
    },
    query,
    filters,
    setFilters: (next) => {
      const changes: Changes = {};
      for (const id of filterIds) {
        const chosen = next[id];
        changes[id] = chosen === undefined ? null : chosen.length === 0 ? "" : chosen;
      }
      write(prefix, changes);
    },
    sort,
    setSort: (next) => {
      const isDefault =
        next?.column === defaultSort?.column && next?.direction === defaultSort?.direction;
      write(prefix, {
        sort: isDefault || !next ? null : `${next.direction === "desc" ? "-" : ""}${next.column}`,
      });
    },
    params: params as Params,
    setParam: (key, value) => {
      write(prefix, { [key]: paramOptions?.[key].default === value ? null : value });
    },
    narrowed: query !== "" || filtering,
  };
}

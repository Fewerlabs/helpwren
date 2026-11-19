"use client";

import {
  hashKey,
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, type Key, type ReactNode } from "react";

import { cn } from "#lib/cn";
import { useMediaQuery } from "#lib/media-query";
import { useScrollableFocus } from "#lib/scrollable-focus";

import { Wren } from "../../illustrations/wren";
import { Button } from "../base/button/button";
import { readPageSize, rememberPageSize } from "../base/pagination/page-size-memory";
import {
  defaultPageSizeOptions,
  Pagination,
  type PaginationNoun,
  type PaginationState,
} from "../base/pagination/pagination";
import { Spinner } from "../base/spinner/spinner";
import { focusRing } from "../base/styles";
import {
  DefaultEmpty,
  DefaultError,
  DefaultLoading,
  InlineError,
  StickyProgress,
  type QueryBehaviour,
  type QueryErrorContext,
} from "./query-states";

export interface QueryListRequest<Cursor> {
  /** The page number, starting at 1. In infinite mode it counts the pages loaded so far. */
  page: number;
  /** In infinite mode: what the previous page returned as `nextCursor`. `undefined` for the first page. */
  cursor: Cursor | undefined;
  pageSize: number | undefined;
  /** Aborted when the request is no longer needed. Pass it to `fetch`. */
  signal: AbortSignal;
}

export interface QueryListPage<Item, Cursor = unknown> {
  items: readonly Item[];
  /** Infinite mode: anything that identifies the next page. Leave it out on the last page. */
  nextCursor?: Cursor | null | undefined;
  /** The total number of items across all pages, when the server knows it. */
  total?: number | undefined;
}

export interface QueryListMessages {
  loading: string;
  empty: ReactNode;
  emptyDescription?: ReactNode;
  error: ReactNode;
  retry: string;
  loadMore: string;
  loadingMore: string;
  /** Shown under the last item once every page has been loaded. */
  end: ReactNode;
  /** The previous and next page buttons' names and tooltips. */
  previous: string;
  next: string;
  /** The name of the page footer's navigation landmark, such as "Contacts pages". */
  pagination: string;
  /** The rows-per-page picker's name. */
  pageSize: string;
}

export const defaultQueryListMessages: QueryListMessages = {
  loading: "Loading",
  empty: "Nothing here yet.",
  error: "This could not be loaded.",
  retry: "Try again",
  loadMore: "Load more",
  loadingMore: "Loading more",
  end: "You've reached the end.",
  previous: "Previous page",
  next: "Next page",
  pagination: "Pagination",
  pageSize: "Rows per page",
};

/** Pass it to `Pagination` to draw the footer when you render the list yourself. */
export interface QueryListPagination extends PaginationState {
  /** Known only when the server returns `total` and you pass `pageSize`. */
  pageCount: number | undefined;
  isFetching: boolean;
  /**
   * `load-more` on a narrow screen, where the next page is added under the rows on screen
   * with `loadMore` instead of replacing them. See `mobilePagination`.
   */
  mode: "pages" | "load-more";
  /** Changes the rows per page, which goes back to the first page. */
  setPageSize: (pageSize: number) => void;
}

/** Everything about the list, for `children` as a function when you render it all yourself. */
export interface QueryListState<Item> {
  items: readonly Item[];
  total: number | undefined;
  status: "loading" | "error" | "empty" | "ready";
  error: unknown;
  /** True whenever a request is running, including background refreshes. */
  isFetching: boolean;
  /**
   * True while the items on screen are being refreshed or replaced by another page, which is
   * when a progress bar shows. A list that refreshes itself on `refetchInterval` does it
   * quietly, so a bar does not flash every few seconds.
   */
  isRefreshing: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  /** True in infinite mode once more than one page was loaded and no pages remain. */
  isEnd: boolean;
  loadMore: () => void;
  retry: () => void;
  refetch: () => void;
  pagination: QueryListPagination | undefined;
}

/** The parts of the page footer a list can turn off or change. Shared with `QueryTable`. */
export interface QueryListFooterOptions {
  /** What the items are, for the page footer's count: "4 contacts". */
  noun?: PaginationNoun | undefined;
  /** Set false to leave the page footer out altogether. Default true. */
  showPagination?: boolean | undefined;
  /** Shows "1–25 of 132" in the footer. Default true. */
  showSummary?: boolean | undefined;
  /** Shows previous and next, or Load more on a phone. Default true. */
  showPageControls?: boolean | undefined;
  /**
   * The sizes the rows-per-page picker offers. Default 10, 25, 50 and 100; `false` hides it.
   * The picker needs `pageSize`, which is where it starts.
   */
  pageSizeOptions?: readonly number[] | false | undefined;
}

export interface QueryListProps<Item, Cursor = unknown>
  extends QueryBehaviour, QueryListFooterOptions {
  /** Identifies this list in the cache. Include every filter the request depends on. */
  queryKey: QueryKey;
  /** Fetches one page. */
  queryFn: (request: QueryListRequest<Cursor>) => Promise<QueryListPage<Item, Cursor>>;
  /**
   * `infinite` appends pages as the end of the list is reached (default).
   * `pages` shows one page at a time with previous and next.
   * `none` loads a single page and shows no paging.
   */
  pagination?: "infinite" | "pages" | "none";
  /** Infinite mode: load the next page on `scroll` (default) or with a `button`. */
  loadMoreOn?: "scroll" | "button";
  /**
   * How many items a page holds. In pages mode it is where the rows-per-page picker starts,
   * or, with `onPageSizeChange`, the size on screen.
   */
  pageSize?: number | undefined;
  /** Pages mode, controlled size: called with the size chosen in the picker. */
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
  /**
   * Pages mode: remembers the rows-per-page choice in this browser under this name, such as
   * `"contacts"`, so the table opens at that size next time.
   */
  pageSizeKey?: string | undefined;
  /** Pages mode, controlled. */
  page?: number | undefined;
  /** Pages mode, uncontrolled: where it starts, and where it goes back to when `queryKey` changes. */
  defaultPage?: number;
  onPageChange?: ((page: number) => void) | undefined;
  /**
   * Pages mode, on a narrow screen: `load-more` (default) swaps previous and next for a Load
   * more button that adds the next page under the rows already shown, which suits a thumb
   * better than paging. `pages` keeps previous and next.
   */
  mobilePagination?: "load-more" | "pages" | undefined;
  /** The screen width in pixels below which `mobilePagination` applies. Default 768, Tailwind's `md`. */
  mobileBreakpoint?: number | undefined;

  /** Renders one item. Not needed when `children` is a function. */
  renderItem?: (item: Item, index: number) => ReactNode;
  getItemKey?: (item: Item, index: number) => Key;
  /** Takes over all rendering. The loading, empty and error states are then yours to draw. */
  children?: (state: QueryListState<Item>) => ReactNode;

  renderLoading?: () => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (context: QueryErrorContext) => ReactNode;
  /** Replaces the page footer, which shows in pages mode whenever there are items. */
  renderPagination?: (pagination: QueryListPagination) => ReactNode;
  /** Replaces the end-of-list marker shown in infinite mode. Return `null` for none. */
  renderEnd?: () => ReactNode;
  /** Content above and below the items, shown once there are items. */
  header?: ReactNode;
  footer?: ReactNode;
  messages?: Partial<QueryListMessages> | undefined;
  /**
   * Classes for the outer box: border, background, radius, scrolling. Keep padding off it.
   * If it scrolls, it becomes a tab stop while its content overflows.
   */
  className?: string;
  /** Classes for the content inside, such as padding. The progress bar sits above this, edge to edge. */
  contentClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  "aria-label"?: string;
}

type ViewProps<Item, Cursor> = Omit<
  QueryListProps<Item, Cursor>,
  "queryKey" | "queryFn" | "page" | "defaultPage" | "onPageChange" | keyof QueryBehaviour
> & { state: QueryListState<Item> };

function behaviour(props: QueryBehaviour): QueryBehaviour {
  const { enabled, staleTime, gcTime, refetchInterval, refetchOnWindowFocus, retry } = props;
  return {
    ...(enabled === undefined ? {} : { enabled }),
    ...(staleTime === undefined ? {} : { staleTime }),
    ...(gcTime === undefined ? {} : { gcTime }),
    ...(refetchInterval === undefined ? {} : { refetchInterval }),
    ...(refetchOnWindowFocus === undefined ? {} : { refetchOnWindowFocus }),
    ...(retry === undefined ? {} : { retry }),
  };
}

function statusOf(
  isPending: boolean,
  isError: boolean,
  itemCount: number,
): QueryListState<unknown>["status"] {
  if (itemCount > 0) {
    return "ready";
  }
  if (isPending) {
    return "loading";
  }
  return isError ? "error" : "empty";
}

/**
 * The page footer for a list's state, with the parts the list asked for. `QueryList` and
 * `QueryTable` both draw it, so every paged list has the same one.
 */
export function QueryListFooter<Item>({
  state,
  messages,
  noun,
  showPagination = true,
  showSummary,
  showPageControls,
  pageSizeOptions,
}: QueryListFooterOptions & {
  state: QueryListState<Item>;
  messages: Pick<QueryListMessages, "pagination" | "previous" | "next" | "pageSize" | "loadMore">;
}) {
  const { pagination } = state;
  if (!pagination || !showPagination) {
    return null;
  }
  return (
    <Pagination
      pagination={pagination}
      mode={pagination.mode}
      onLoadMore={state.loadMore}
      loadingMore={state.isFetchingMore}
      onPageSizeChange={pagination.setPageSize}
      pageSizeOptions={pageSizeOptions}
      showSummary={showSummary}
      showControls={showPageControls}
      noun={noun}
      messages={{
        label: messages.pagination,
        previous: messages.previous,
        next: messages.next,
        pageSize: messages.pageSize,
        loadMore: messages.loadMore,
      }}
    />
  );
}

function ListView<Item, Cursor>({
  state,
  pagination: mode = "infinite",
  loadMoreOn = "scroll",
  renderItem,
  getItemKey,
  children,
  renderLoading,
  renderEmpty,
  renderError,
  renderPagination,
  renderEnd,
  noun,
  showPagination,
  showSummary,
  showPageControls,
  pageSizeOptions,
  header,
  footer,
  messages: overrides,
  className,
  contentClassName,
  listClassName,
  itemClassName,
  "aria-label": ariaLabel,
}: ViewProps<Item, Cursor>) {
  const messages = { ...defaultQueryListMessages, ...overrides };
  const sentinel = useRef<HTMLDivElement | null>(null);
  // A caller may make the list its own scrolling box; a keyboard must be able to scroll it.
  const scrollable = useScrollableFocus<HTMLDivElement>();
  const { hasMore, loadMore, items, status, isFetching, isFetchingMore, isEnd, retry, error } =
    state;
  const autoLoad = mode === "infinite" && loadMoreOn === "scroll";

  useEffect(() => {
    const element = sentinel.current;
    if (!autoLoad || !hasMore || !element || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [autoLoad, hasMore, loadMore, items.length]);

  if (children) {
    return children(state);
  }

  const errorContext: QueryErrorContext = { error, retry, retrying: isFetching };
  const hasError = error !== null && error !== undefined;

  function body(): ReactNode {
    if (status === "loading") {
      return renderLoading?.() ?? <DefaultLoading label={messages.loading} />;
    }
    if (status === "error") {
      return (
        renderError?.(errorContext) ?? (
          <DefaultError
            title={messages.error}
            retryLabel={messages.retry}
            retry={retry}
            retrying={isFetching}
          />
        )
      );
    }
    if (status === "empty") {
      return (
        renderEmpty?.() ?? (
          <DefaultEmpty
            title={messages.empty}
            {...(messages.emptyDescription === undefined
              ? {}
              : { description: messages.emptyDescription })}
          />
        )
      );
    }
    return (
      <>
        {header}
        <ul aria-label={ariaLabel} className={listClassName}>
          {items.map((item, index) => (
            <li key={getItemKey ? getItemKey(item, index) : index} className={itemClassName}>
              {renderItem?.(item, index)}
            </li>
          ))}
        </ul>
        {hasError && !isFetching
          ? (renderError?.(errorContext) ?? (
              <InlineError
                title={messages.error}
                retryLabel={messages.retry}
                retry={retry}
                retrying={isFetching}
              />
            ))
          : null}
        {mode === "infinite" && hasMore && !hasError ? (
          autoLoad ? (
            <>
              <div ref={sentinel} aria-hidden="true" className="h-px" />
              {/* The next page arrives at the bottom, so that is where loading shows. */}
              {isFetchingMore ? (
                <p
                  role="status"
                  className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm"
                >
                  <Spinner label="" aria-hidden="true" />
                  {messages.loadingMore}
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex justify-center py-3">
              <Button variant="secondary" size="sm" onClick={loadMore} loading={isFetchingMore}>
                {messages.loadMore}
              </Button>
            </div>
          )
        ) : null}
        {isEnd && !hasError ? (
          renderEnd ? (
            renderEnd()
          ) : (
            <div
              data-slot="query-list-end"
              className="text-muted-foreground flex flex-col items-center gap-1 py-6 text-xs"
            >
              <Wren scene="all-caught-up" decorative className="max-w-28" />
              <p>{messages.end}</p>
            </div>
          )
        ) : null}
        {state.pagination && renderPagination ? (
          renderPagination(state.pagination)
        ) : (
          <QueryListFooter
            state={state}
            messages={messages}
            noun={noun}
            showPagination={showPagination}
            showSummary={showSummary}
            showPageControls={showPageControls}
            pageSizeOptions={pageSizeOptions}
          />
        )}
        {footer}
      </>
    );
  }

  return (
    <div
      data-slot="query-list"
      data-status={status}
      aria-busy={isFetching || undefined}
      className={cn("relative", focusRing, className)}
      {...scrollable}
    >
      {/* With items on screen, loading shows as a bar along the top so the list does not jump. */}
      <StickyProgress active={state.isRefreshing} label={messages.loading} />
      <div data-slot="query-list-content" className={contentClassName}>
        {body()}
      </div>
    </div>
  );
}

function InfiniteQueryList<Item, Cursor>(props: QueryListProps<Item, Cursor>) {
  const { queryKey, queryFn, pageSize, refetchInterval } = props;
  const query = useInfiniteQuery({
    queryKey: [...queryKey, { pagination: "infinite", pageSize }],
    queryFn: ({ pageParam, signal }) =>
      queryFn({ page: pageParam.page, cursor: pageParam.cursor, pageSize, signal }),
    initialPageParam: { page: 1, cursor: undefined as Cursor | undefined },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.nextCursor === undefined || lastPage.nextCursor === null
        ? undefined
        : { page: allPages.length + 1, cursor: lastPage.nextCursor },
    ...behaviour(props),
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const { fetchNextPage, refetch, hasNextPage, isFetchingNextPage } = query;

  const state: QueryListState<Item> = {
    items,
    total: pages.at(-1)?.total,
    status: statusOf(query.isPending, query.isError, items.length),
    error: query.error,
    isFetching: query.isFetching,
    // Loading the next page shows at the bottom instead; the bar is for refreshes.
    isRefreshing: query.isFetching && !isFetchingNextPage && items.length > 0 && !refetchInterval,
    isFetchingMore: isFetchingNextPage,
    isEnd: pages.length > 1 && !hasNextPage,
    hasMore: hasNextPage,
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    // After a failed "load more", try that page again; otherwise reload the list.
    retry: () => {
      void (items.length > 0 && query.isFetchNextPageError ? fetchNextPage() : refetch());
    },
    refetch: () => {
      void refetch();
    },
    pagination: undefined,
  };

  return <ListView {...props} state={state} />;
}

function PagedQueryList<Item, Cursor>(props: QueryListProps<Item, Cursor>) {
  const {
    queryKey,
    queryFn,
    pagination = "pages",
    onPageChange,
    onPageSizeChange,
    pageSizeKey,
    pageSizeOptions = defaultPageSizeOptions,
    mobilePagination = "load-more",
    mobileBreakpoint = 768,
    refetchInterval,
  } = props;
  const controlled = props.page !== undefined;
  const firstPage = props.defaultPage ?? 1;
  const [internalPage, setInternalPage] = useState(firstPage);

  // The size picked in the footer, unless the caller holds it. It starts from what this browser
  // chose last time for the same table.
  const sizeControlled = onPageSizeChange !== undefined;
  const [chosenSize, setChosenSize] = useState(() =>
    pageSizeKey === undefined
      ? undefined
      : readPageSize(pageSizeKey, pageSizeOptions === false ? undefined : pageSizeOptions),
  );
  const pageSize = sizeControlled ? props.pageSize : (chosenSize ?? props.pageSize);

  // A new search or filter is a new list, so it starts again from its first page rather than
  // asking for page 3 of results that may have only one. Reset while rendering, so the old
  // page number is never fetched under the new key.
  const keyHash = hashKey(queryKey);
  const [pageKeyHash, setPageKeyHash] = useState(keyHash);
  if (pageKeyHash !== keyHash) {
    setPageKeyHash(keyHash);
    setInternalPage(firstPage);
  }
  const page = pagination === "none" ? 1 : (props.page ?? internalPage);

  // On a phone, pages after the one on screen are added below it. How many is reset whenever
  // the list, the size or the page changes, as those rows belong to another list.
  const narrow = useMediaQuery(`(max-width: ${mobileBreakpoint - 0.02}px)`);
  const loadMoreMode = pagination === "pages" && mobilePagination === "load-more" && narrow;
  const appendedFor = `${keyHash}:${pageSize}:${page}`;
  const [appended, setAppended] = useState({ for: appendedFor, count: 0 });
  if (appended.for !== appendedFor) {
    setAppended({ for: appendedFor, count: 0 });
  }
  const appendedCount = appended.for === appendedFor ? appended.count : 0;

  // Every page, on screen or appended, is asked for under the same key, so a page loaded on a
  // phone is already there when the window widens, and the other way round.
  const pageQuery = (number: number) => ({
    queryKey: [...queryKey, { pagination, page: number, pageSize }],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      queryFn({ page: number, cursor: undefined, pageSize, signal }),
    ...behaviour(props),
  });

  const query = useQuery({
    ...pageQuery(page),
    // The page on screen stays until the next one arrives.
    placeholderData: keepPreviousData,
  });
  const more = useQueries({
    queries: loadMoreMode
      ? Array.from({ length: appendedCount }, (_, index) => pageQuery(page + index + 1))
      : [],
  });

  // The rows run on only as far as the pages have arrived, so none is shown out of order.
  const firstMissing = more.findIndex((result) => result.data === undefined);
  const loaded = firstMissing === -1 ? more : more.slice(0, firstMissing);
  const items = [
    ...(query.data?.items ?? []),
    ...loaded.flatMap((result) => result.data?.items ?? []),
  ];
  const last = loaded.at(-1)?.data ?? query.data;
  const total = query.data?.total;
  const pageCount =
    total !== undefined && pageSize !== undefined && pageSize > 0
      ? Math.max(1, Math.ceil(total / pageSize))
      : undefined;
  const lastLoadedPage = page + loaded.length;
  const hasNext =
    pageCount === undefined
      ? last?.nextCursor !== undefined && last.nextCursor !== null
      : lastLoadedPage < pageCount;
  const isFetchingMore = more.some((result) => result.data === undefined && result.isFetching);
  const failed = more.filter((result) => result.isError);
  const { refetch } = query;

  // The list can shrink under the page on screen, as people leave a live list or rows are
  // removed. Then the last page that still exists is shown instead of an empty one. A
  // placeholder is the previous query's answer, so it says nothing about this page.
  const lastPage =
    pagination !== "none" && !query.isPlaceholderData && pageCount !== undefined && page > pageCount
      ? pageCount
      : undefined;
  if (lastPage !== undefined && !controlled) {
    setInternalPage(lastPage);
  }
  useEffect(() => {
    if (lastPage !== undefined && controlled) {
      onPageChange?.(lastPage);
    }
  }, [lastPage, controlled, onPageChange]);

  function setPage(next: number) {
    if (!controlled) {
      setInternalPage(next);
    }
    onPageChange?.(next);
  }

  const state: QueryListState<Item> = {
    items,
    total,
    status: statusOf(query.isPending, query.isError, items.length),
    error: query.error ?? failed[0]?.error ?? null,
    isFetching: query.isFetching || isFetchingMore,
    // Another page or filter always shows the bar; a list that polls refreshes quietly.
    isRefreshing:
      query.isFetching && items.length > 0 && (!refetchInterval || query.isPlaceholderData),
    isFetchingMore,
    isEnd: false,
    hasMore: loadMoreMode && hasNext,
    loadMore: () => {
      if (loadMoreMode && hasNext && !isFetchingMore) {
        setAppended({ for: appendedFor, count: appendedCount + 1 });
      }
    },
    retry: () => {
      if (query.isError) void refetch();
      for (const result of failed) void result.refetch();
    },
    refetch: () => {
      void refetch();
    },
    pagination:
      pagination === "none"
        ? undefined
        : {
            page,
            pageCount,
            pageSize,
            total,
            itemCount: items.length,
            hasPrevious: page > 1,
            hasNext,
            isFetching: query.isFetching,
            mode: loadMoreMode ? "load-more" : "pages",
            setPage,
            setPageSize: (next) => {
              if (pageSizeKey !== undefined) {
                rememberPageSize(pageSizeKey, next);
              }
              if (!sizeControlled) {
                setChosenSize(next);
              }
              onPageSizeChange?.(next);
              // Page 4 of 25 is not page 4 of 100, so a new size starts from the top.
              if (page !== 1) {
                setPage(1);
              }
            },
          },
  };

  return <ListView {...props} state={state} />;
}

/**
 * Fetches a list and draws every state of it: loading, empty, error with retry,
 * the items, and paging or infinite scrolling. Results are cached by `queryKey`
 * with TanStack Query, so it needs a `QueryClientProvider` above it.
 */
export function QueryList<Item, Cursor = unknown>(props: QueryListProps<Item, Cursor>) {
  return (props.pagination ?? "infinite") === "infinite" ? (
    <InfiniteQueryList {...props} />
  ) : (
    <PagedQueryList {...props} />
  );
}

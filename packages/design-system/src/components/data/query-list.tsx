"use client";

import {
  hashKey,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, type Key, type ReactNode } from "react";

import { cn } from "#lib/cn";
import { useScrollableFocus } from "#lib/scrollable-focus";

import { Wren } from "../../illustrations/wren";
import { Button } from "../base/button/button";
import {
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
}

const defaultMessages: QueryListMessages = {
  loading: "Loading",
  empty: "Nothing here yet.",
  error: "This could not be loaded.",
  retry: "Try again",
  loadMore: "Load more",
  loadingMore: "Loading more",
  end: "You've reached the end.",
  previous: "Previous page",
  next: "Next page",
};

/** Pass it to `Pagination` to draw the footer when you render the list yourself. */
export interface QueryListPagination extends PaginationState {
  /** Known only when the server returns `total` and you pass `pageSize`. */
  pageCount: number | undefined;
  isFetching: boolean;
}

/** Everything about the list, for `children` as a function when you render it all yourself. */
export interface QueryListState<Item> {
  items: readonly Item[];
  total: number | undefined;
  status: "loading" | "error" | "empty" | "ready";
  error: unknown;
  /** True whenever a request is running, including background refreshes. */
  isFetching: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  /** True in infinite mode once more than one page was loaded and no pages remain. */
  isEnd: boolean;
  loadMore: () => void;
  retry: () => void;
  refetch: () => void;
  pagination: QueryListPagination | undefined;
}

export interface QueryListProps<Item, Cursor = unknown> extends QueryBehaviour {
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
  pageSize?: number;
  /** Pages mode, controlled. */
  page?: number;
  /** Pages mode, uncontrolled: where it starts, and where it goes back to when `queryKey` changes. */
  defaultPage?: number;
  onPageChange?: (page: number) => void;

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
  /** What the items are, for the page footer's count: "4 contacts". */
  noun?: PaginationNoun;
  /** Replaces the end-of-list marker shown in infinite mode. Return `null` for none. */
  renderEnd?: () => ReactNode;
  /** Content above and below the items, shown once there are items. */
  header?: ReactNode;
  footer?: ReactNode;
  messages?: Partial<QueryListMessages>;
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
  header,
  footer,
  messages: overrides,
  className,
  contentClassName,
  listClassName,
  itemClassName,
  "aria-label": ariaLabel,
}: ViewProps<Item, Cursor>) {
  const messages = { ...defaultMessages, ...overrides };
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
        {state.pagination
          ? (renderPagination?.(state.pagination) ?? (
              <Pagination
                pagination={state.pagination}
                {...(noun === undefined ? {} : { noun })}
                messages={{ previous: messages.previous, next: messages.next }}
              />
            ))
          : null}
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
      <StickyProgress
        // Loading the next page shows at the bottom instead; the bar is for refreshes.
        active={isFetching && status === "ready" && !isFetchingMore}
        label={messages.loading}
      />
      <div data-slot="query-list-content" className={contentClassName}>
        {body()}
      </div>
    </div>
  );
}

function InfiniteQueryList<Item, Cursor>(props: QueryListProps<Item, Cursor>) {
  const { queryKey, queryFn, pageSize } = props;
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
  const { queryKey, queryFn, pageSize, pagination = "pages", onPageChange } = props;
  const controlled = props.page !== undefined;
  const firstPage = props.defaultPage ?? 1;
  const [internalPage, setInternalPage] = useState(firstPage);
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

  const query = useQuery({
    queryKey: [...queryKey, { pagination, page, pageSize }],
    queryFn: ({ signal }) => queryFn({ page, cursor: undefined, pageSize, signal }),
    // The page on screen stays until the next one arrives.
    placeholderData: keepPreviousData,
    ...behaviour(props),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total;
  const pageCount =
    total !== undefined && pageSize !== undefined && pageSize > 0
      ? Math.max(1, Math.ceil(total / pageSize))
      : undefined;
  const hasNext =
    pageCount === undefined
      ? query.data?.nextCursor !== undefined && query.data.nextCursor !== null
      : page < pageCount;
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

  const state: QueryListState<Item> = {
    items,
    total,
    status: statusOf(query.isPending, query.isError, items.length),
    error: query.error,
    isFetching: query.isFetching,
    isFetchingMore: false,
    isEnd: false,
    hasMore: false,
    loadMore: () => undefined,
    retry: () => {
      void refetch();
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
            setPage: (next) => {
              if (!controlled) {
                setInternalPage(next);
              }
              onPageChange?.(next);
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

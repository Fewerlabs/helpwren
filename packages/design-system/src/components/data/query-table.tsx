"use client";

import { hashKey } from "@tanstack/react-query";
import { useCallback, useState, type ReactNode } from "react";

import { cn } from "#lib/cn";
import { useScrollableFocus } from "#lib/scrollable-focus";

import { focusRing } from "../base/styles";
import {
  DataTable,
  type DataTableKey,
  type DataTableProps,
  type DataTableReorder,
} from "../base/table/data-table";
import { EmptyState } from "../shared/empty-state/empty-state";
import { PullIndicator, pullStyle, usePullToRefresh } from "./pull-to-refresh";
import {
  defaultQueryListMessages,
  QueryList,
  QueryListFooter,
  type QueryListMessages,
  type QueryListProps,
  type QueryListState,
} from "./query-list";
import {
  DefaultEmpty,
  DefaultError,
  DefaultLoading,
  InlineError,
  StickyProgress,
} from "./query-states";

export interface QueryTableMessages extends Omit<
  QueryListMessages,
  "end" | "loadingMore" | "emptyDescription"
> {
  /** The title of the default empty state while a search or filter is narrowing the rows. */
  emptyFiltered: ReactNode;
  emptyFilteredDescription: ReactNode;
}

const defaultMessages: QueryTableMessages = {
  ...defaultQueryListMessages,
  emptyFiltered: "No results",
  emptyFilteredDescription: "Try a different search or fewer filters.",
};

export interface QueryTableReorder<Item> extends Omit<DataTableReorder<Item>, "onReorder"> {
  /**
   * Called with every row's key in the new order once a row is dropped. Return the promise of
   * saving it: the rows stay in the dropped order until it settles, so a row does not jump
   * back while the change is on its way. Show a failure yourself; the rows then go back.
   */
  onReorder: (keys: DataTableKey[]) => unknown;
}

export interface QueryTableProps<Item>
  extends
    Omit<
      QueryListProps<Item>,
      | "pagination"
      | "loadMoreOn"
      | "renderItem"
      | "getItemKey"
      | "children"
      | "renderLoading"
      | "renderEmpty"
      | "renderError"
      | "renderPagination"
      | "renderEnd"
      | "header"
      | "footer"
      | "messages"
      | "contentClassName"
      | "listClassName"
      | "itemClassName"
      | "aria-label"
    >,
    Pick<
      DataTableProps<Item>,
      | "columns"
      | "getRowKey"
      | "caption"
      | "showCaption"
      | "density"
      | "rowProps"
      | "renderMobileRow"
      | "loadingRows"
    > {
  /** `pages` (default) pages with the footer; `none` loads one page and shows every row. */
  pagination?: "pages" | "none";
  /** Lets people drag the rows into their own order. Leave it out while sorting or filtering. */
  reorder?: QueryTableReorder<Item> | undefined;
  /**
   * What the first load shows. `loader` (default) is the app's loader, the same as every other
   * list and detail; `skeleton` is rows in the table's shape, for a table whose layout should
   * hold still while it loads.
   */
  placeholder?: "loader" | "skeleton";
  /**
   * What goes above the table, such as a header with a title, count and search, and a filter
   * bar. It stays through every state. Pass a function to read the list, such as its `total`.
   */
  toolbar?: ReactNode | ((state: QueryListState<Item>) => ReactNode);
  /** Shown in place of the rows when there are none. Default: `messages.empty`. */
  empty?: ReactNode;
  /** Set while a search or filter is narrowing the rows, so an empty table says so. */
  filtered?: boolean;
  /** Shown when there are no rows while `filtered`. Default: "No results" and a hint. */
  emptyFiltered?: ReactNode;
  messages?: Partial<QueryTableMessages> | undefined;
  /** Classes for the outer column, which fills its parent: the table scrolls, the footer stays. */
  className?: string;
}

interface TableViewProps<Item> extends Omit<
  QueryTableProps<Item>,
  "queryKey" | "queryFn" | "messages"
> {
  state: QueryListState<Item>;
  listKey: string;
  messages: QueryTableMessages;
}

/** The order a drop asked for, held until it is saved, for the list it was made in. */
interface Dropped {
  list: string;
  keys: readonly DataTableKey[];
}

function TableView<Item>({
  state,
  listKey,
  messages,
  columns,
  getRowKey,
  caption,
  showCaption,
  density,
  rowProps,
  renderMobileRow,
  loadingRows,
  reorder,
  placeholder = "loader",
  // The table always scrolls in its own box, so pulling its top refreshes it. Not while rows
  // can be dragged into order, where a drag down from the top is a move.
  pullToRefresh = !reorder,
  toolbar,
  empty,
  filtered = false,
  emptyFiltered,
  noun,
  showPagination,
  showSummary,
  showPageControls,
  pageSizeOptions,
  className,
}: TableViewProps<Item>) {
  // The table scrolls inside the panel; a keyboard must be able to scroll it too.
  const scrollable = useScrollableFocus<HTMLDivElement>();
  const [dropped, setDropped] = useState<Dropped | null>(null);
  const { items, status, error, isFetching, retry } = state;
  const pull = usePullToRefresh({
    enabled: pullToRefresh && status !== "loading",
    onRefresh: state.refetch,
    busy: isFetching,
  });
  const { ref: scrollRef } = scrollable;
  const { ref: pullRef } = pull;
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef(element);
      pullRef(element);
    },
    [scrollRef, pullRef],
  );

  const order = dropped?.list === listKey ? dropped.keys : null;
  const byKey = new Map(items.map((item, index) => [getRowKey(item, index), item]));
  const rows = order ? order.flatMap((key) => byKey.get(key) ?? []) : items;

  const emptyContent = filtered
    ? (emptyFiltered ?? (
        <EmptyState
          role="status"
          scene="no-results"
          size="sm"
          title={messages.emptyFiltered}
          description={messages.emptyFilteredDescription}
        />
      ))
    : (empty ?? <DefaultEmpty title={messages.empty} />);

  return (
    <div data-slot="query-table" className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {typeof toolbar === "function" ? toolbar(state) : toolbar}
      <div
        data-slot="query-table-scroll"
        data-status={status}
        aria-busy={isFetching || undefined}
        className={cn("relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain", focusRing)}
        {...scrollable}
        ref={ref}
      >
        {/* A refresh shows as a bar along the top, so the rows stay put while it runs. */}
        <StickyProgress active={state.isRefreshing && !pull.refreshing} label={messages.loading} />
        <PullIndicator state={pull} label={messages.loading} />
        <div style={pullStyle(pull)}>
          {status === "loading" && placeholder === "loader" ? (
            <DefaultLoading label={messages.loading} />
          ) : status === "error" ? (
            <DefaultError
              title={messages.error}
              retryLabel={messages.retry}
              retry={retry}
              retrying={isFetching}
            />
          ) : (
            <DataTable
              caption={caption}
              columns={columns}
              rows={rows}
              getRowKey={getRowKey}
              // Placeholder rows only on the first load; after that the rows stay on screen.
              loading={status === "loading"}
              empty={emptyContent}
              {...(showCaption === undefined ? {} : { showCaption })}
              {...(density === undefined ? {} : { density })}
              {...(rowProps === undefined ? {} : { rowProps })}
              {...(renderMobileRow === undefined ? {} : { renderMobileRow })}
              {...(loadingRows === undefined ? {} : { loadingRows })}
              reorder={
                reorder
                  ? {
                      label: reorder.label,
                      onReorder: (keys) => {
                        const next = { list: listKey, keys };
                        setDropped(next);
                        const clear = () => {
                          // A later drop may have happened meanwhile; its order stays until its own save is back.
                          setDropped((current) => (current === next ? null : current));
                        };
                        Promise.resolve(reorder.onReorder(keys)).then(clear, clear);
                      },
                    }
                  : undefined
              }
            />
          )}
          {/* A failed refresh keeps the rows it had, with a way to try again under them. */}
          {status === "ready" && error !== null && error !== undefined && !isFetching ? (
            <InlineError
              title={messages.error}
              retryLabel={messages.retry}
              retry={retry}
              retrying={isFetching}
            />
          ) : null}
        </div>
      </div>
      {status === "ready" ? (
        <QueryListFooter
          state={state}
          messages={messages}
          noun={noun}
          showPagination={showPagination}
          showSummary={showSummary}
          showPageControls={showPageControls}
          pageSizeOptions={pageSizeOptions}
        />
      ) : null}
    </div>
  );
}

/**
 * A fetched table that draws every state of itself: placeholder rows on the first load, a
 * progress bar on a refresh, an error with Try again, an empty table (and a different one
 * while a search or filter is narrowing it), and the page footer pinned under the rows. It is
 * `QueryList` and `DataTable` together, so a page describes only its columns, rows and words.
 */
export function QueryTable<Item>({
  messages: overrides,
  pagination = "pages",
  ...props
}: QueryTableProps<Item>) {
  const messages = { ...defaultMessages, ...overrides };
  const listKey = hashKey(props.queryKey);
  return (
    <QueryList<Item> {...props} pagination={pagination} messages={messages}>
      {(state) => <TableView {...props} state={state} listKey={listKey} messages={messages} />}
    </QueryList>
  );
}

"use client";

import { useMemo, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";

import { cn } from "#lib/cn";

import { Checkbox } from "../checkbox/checkbox";
import { Icon } from "../icon/icon";
import { LinearProgress } from "../linear-progress/linear-progress";
import { Skeleton } from "../skeleton/skeleton";
import { focusRing } from "../styles";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export type DataTableKey = string | number;
export type DataTableSortValue = string | number | Date | boolean | null | undefined;

export interface DataTableSort {
  column: string;
  direction: "asc" | "desc";
}

export interface DataTableColumn<Row> {
  /** A stable id. Used for sorting and as the React key. */
  id: string;
  header: ReactNode;
  /** Renders the cell for a row. */
  cell: (row: Row, index: number) => ReactNode;
  /** Lets people sort by this column by pressing its header. */
  sortable?: boolean;
  /** The value to sort by when the table sorts rows itself. Without it, sorting is left to you. */
  sortValue?: (row: Row) => DataTableSortValue;
  align?: "start" | "center" | "end";
  /** A CSS width, such as `"12rem"`, `"30%"` or `160`. */
  width?: CSSProperties["width"];
  /** Content for this column in the table footer, such as a total. */
  footer?: ReactNode | ((rows: readonly Row[]) => ReactNode);
  /** Leaves the column out without removing it from the list. */
  hidden?: boolean;
  /** Marks the cell as the row's header, which screen readers announce with the other cells. */
  rowHeader?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableMessages {
  empty: ReactNode;
  loading: string;
  selectAll: string;
  selectRow: (key: DataTableKey) => string;
  sortBy: (column: string) => string;
}

const defaultMessages: DataTableMessages = {
  empty: "Nothing to show.",
  loading: "Loading",
  selectAll: "Select all rows",
  selectRow: (key) => `Select row ${key}`,
  sortBy: (column) => `Sort by ${column}`,
};

export interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row, index: number) => DataTableKey;
  /** Describes the table. It is read by screen readers and hidden visually unless `showCaption`. */
  caption: ReactNode;
  showCaption?: boolean;

  sort?: DataTableSort | null;
  defaultSort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  /**
   * Set when the rows arrive already sorted, for example from a server. The table then
   * only reports the chosen sort through `onSortChange` and leaves the order alone.
   */
  manualSorting?: boolean;

  /** Adds a checkbox column. */
  selectable?: boolean;
  selectedKeys?: readonly DataTableKey[];
  defaultSelectedKeys?: readonly DataTableKey[];
  onSelectedKeysChange?: (keys: DataTableKey[]) => void;
  isRowSelectable?: (row: Row) => boolean;

  /** Shows placeholder rows when there are none yet, or a progress bar over the rows that are there. */
  loading?: boolean;
  loadingRows?: number;
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode;

  density?: "comfortable" | "compact";
  /** Keeps the header visible while the body scrolls. Give the table a height with `containerClassName`. */
  stickyHeader?: boolean;
  striped?: boolean;
  /** Extra props for a row, such as `className`, `data-*` or event handlers. */
  rowProps?: (row: Row, index: number) => ComponentProps<"tr">;
  /**
   * Draws each row as an item of a list on a narrow screen, below `md`, in place of the table,
   * whose columns would otherwise be cut down to one or two or scroll out of sight. Return the
   * row's content; make it one link or button when the row opens something, so all of it can
   * be tapped.
   */
  renderMobileRow?: (row: Row, index: number) => ReactNode;
  messages?: Partial<DataTableMessages>;
  className?: string;
  containerClassName?: string;
}

const alignment = { start: "text-left", center: "text-center", end: "text-right" } as const;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isEmpty(value: DataTableSortValue): value is null | undefined {
  return value === null || value === undefined;
}

function compare(first: DataTableSortValue, second: DataTableSortValue): number {
  if (typeof first === "string" && typeof second === "string") {
    return collator.compare(first, second);
  }
  return Number(first) - Number(second);
}

function nextSort(current: DataTableSort | null, column: string): DataTableSort | null {
  if (current?.column !== column) {
    return { column, direction: "asc" };
  }
  return current.direction === "asc" ? { column, direction: "desc" } : null;
}

/**
 * A table built from a list of columns. It handles sorting, row selection, loading
 * and empty states; each cell and header is whatever you render.
 */
export function DataTable<Row>({
  columns: allColumns,
  rows,
  getRowKey,
  caption,
  showCaption = false,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSorting = false,
  selectable = false,
  selectedKeys,
  defaultSelectedKeys,
  onSelectedKeysChange,
  isRowSelectable,
  loading = false,
  loadingRows = 5,
  empty,
  density = "comfortable",
  stickyHeader = false,
  striped = false,
  rowProps,
  renderMobileRow,
  messages: overrides,
  className,
  containerClassName,
}: DataTableProps<Row>) {
  const messages = { ...defaultMessages, ...overrides };
  const columns = allColumns.filter((column) => column.hidden !== true);
  const [internalSort, setInternalSort] = useState<DataTableSort | null>(defaultSort);
  const sort = sortProp === undefined ? internalSort : sortProp;
  const [internalSelection, setInternalSelection] = useState<readonly DataTableKey[]>(
    defaultSelectedKeys ?? [],
  );
  const selection = selectedKeys ?? internalSelection;

  const sortColumn = allColumns.find((column) => column.id === sort?.column);
  const sortValue = sortColumn?.sortValue;
  const direction = sort?.direction;
  const sortedRows = useMemo(() => {
    if (manualSorting || !sortValue || !direction) {
      return rows;
    }
    const factor = direction === "asc" ? 1 : -1;
    return rows
      .map((row, index) => ({ row, index, value: sortValue(row) }))
      .sort((first, second) => {
        // Empty values go last whichever way the column is sorted.
        const order =
          isEmpty(first.value) || isEmpty(second.value)
            ? Number(isEmpty(first.value)) - Number(isEmpty(second.value))
            : compare(first.value, second.value) * factor;
        // Equal values keep the order they arrived in.
        return order === 0 ? first.index - second.index : order;
      })
      .map(({ row }) => row);
  }, [rows, sortValue, direction, manualSorting]);

  const keyed = sortedRows.map((row, index) => ({ row, index, key: getRowKey(row, index) }));
  const selectableKeys = keyed
    .filter(({ row }) => isRowSelectable?.(row) ?? true)
    .map(({ key }) => key);
  const selectedCount = selectableKeys.filter((key) => selection.includes(key)).length;
  const allSelected = selectableKeys.length > 0 && selectedCount === selectableKeys.length;

  function changeSort(column: string) {
    const next = nextSort(sort, column);
    if (sortProp === undefined) {
      setInternalSort(next);
    }
    onSortChange?.(next);
  }

  function changeSelection(next: DataTableKey[]) {
    if (selectedKeys === undefined) {
      setInternalSelection(next);
    }
    onSelectedKeysChange?.(next);
  }

  const cellPadding = density === "compact" ? "py-1.5" : "py-2.5";
  const sticky = stickyHeader ? "bg-card sticky top-0 z-10" : undefined;
  const columnCount = columns.length + (selectable ? 1 : 0);
  const hasFooter = columns.some((column) => column.footer !== undefined);
  const showSkeleton = loading && rows.length === 0;
  const showEmpty = !showSkeleton && rows.length === 0;

  const table = (
    <Table
      data-slot="data-table"
      aria-busy={loading || undefined}
      className={className}
      containerClassName={cn(renderMobileRow && "max-md:hidden", containerClassName)}
    >
      <TableCaption className={showCaption ? undefined : "sr-only"}>{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {selectable ? (
            <TableHead className={cn("w-10", sticky)}>
              <Checkbox
                aria-label={messages.selectAll}
                checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false}
                disabled={selectableKeys.length === 0}
                onCheckedChange={(checked) => {
                  const others = selection.filter((key) => !selectableKeys.includes(key));
                  changeSelection(checked === true ? [...others, ...selectableKeys] : others);
                }}
              />
            </TableHead>
          ) : null}
          {columns.map((column) => {
            const active = sort?.column === column.id ? sort.direction : undefined;
            return (
              <TableHead
                key={column.id}
                scope="col"
                aria-sort={
                  column.sortable
                    ? active === "asc"
                      ? "ascending"
                      : active === "desc"
                        ? "descending"
                        : "none"
                    : undefined
                }
                style={column.width === undefined ? undefined : { width: column.width }}
                className={cn(alignment[column.align ?? "start"], sticky, column.headerClassName)}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => {
                      changeSort(column.id);
                    }}
                    className={cn(
                      "hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors",
                      active && "text-foreground",
                      focusRing,
                    )}
                  >
                    {column.header}
                    <Icon
                      name={active === "desc" ? "caret-down" : "caret-up"}
                      weight="bold"
                      className={cn("size-3", active ? "opacity-100" : "opacity-0")}
                    />
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            );
          })}
        </TableRow>
        {/* With rows on screen, loading shows as a bar under the header so the table does not jump. */}
        {loading && rows.length > 0 ? (
          <tr>
            <td colSpan={columnCount} className="h-0 p-0">
              <LinearProgress label={messages.loading} />
            </td>
          </tr>
        ) : null}
      </TableHeader>
      <TableBody>
        {showSkeleton
          ? Array.from({ length: loadingRows }, (_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {Array.from({ length: columnCount }, (__, cellIndex) => (
                  <TableCell key={cellIndex} className={cellPadding}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : null}
        {showEmpty && !renderMobileRow ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={columnCount}
              className="text-muted-foreground py-10 text-center whitespace-normal"
            >
              {empty ?? messages.empty}
            </TableCell>
          </TableRow>
        ) : null}
        {keyed.map(({ row, index, key }) => {
          const selected = selection.includes(key);
          const canSelect = isRowSelectable?.(row) ?? true;
          const { className: rowClassName, ...restRowProps } = rowProps?.(row, index) ?? {};
          return (
            <TableRow
              key={key}
              data-state={selected ? "selected" : undefined}
              className={cn(striped && "even:bg-muted/40", rowClassName)}
              {...restRowProps}
            >
              {selectable ? (
                <TableCell className={cn("w-10", cellPadding)}>
                  <Checkbox
                    aria-label={messages.selectRow(key)}
                    checked={selected}
                    disabled={!canSelect}
                    onCheckedChange={(checked) => {
                      changeSelection(
                        checked === true
                          ? [...selection, key]
                          : selection.filter((item) => item !== key),
                      );
                    }}
                  />
                </TableCell>
              ) : null}
              {columns.map((column) => {
                const Cell = column.rowHeader ? "th" : TableCell;
                return (
                  <Cell
                    key={column.id}
                    {...(column.rowHeader ? { scope: "row" as const } : {})}
                    className={cn(
                      column.rowHeader &&
                        "border-rule px-3 text-left align-middle font-medium whitespace-nowrap",
                      cellPadding,
                      alignment[column.align ?? "start"],
                      column.className,
                    )}
                  >
                    {column.cell(row, index)}
                  </Cell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
      {hasFooter ? (
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            {selectable ? <TableCell /> : null}
            {columns.map((column) => (
              <TableCell
                key={column.id}
                className={cn(cellPadding, alignment[column.align ?? "start"])}
              >
                {typeof column.footer === "function" ? column.footer(sortedRows) : column.footer}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );

  if (!renderMobileRow) {
    return table;
  }

  // Both are drawn and CSS picks one, so the server renders the right one for any screen. The
  // empty content is drawn once, under both, so a page never holds two copies of it.
  return (
    <>
      {table}
      <div data-slot="data-table-list" aria-busy={loading || undefined} className="md:hidden">
        {loading && rows.length > 0 ? <LinearProgress label={messages.loading} /> : null}
        <ul
          aria-label={typeof caption === "string" ? caption : undefined}
          className="divide-rule divide-y"
        >
          {showSkeleton
            ? Array.from({ length: loadingRows }, (_, rowIndex) => (
                <li key={rowIndex} className="grid gap-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </li>
              ))
            : null}
          {keyed.map(({ row, index, key }) => {
            const selected = selection.includes(key);
            return (
              <li
                key={key}
                data-state={selected ? "selected" : undefined}
                className="data-[state=selected]:bg-muted flex items-start"
              >
                {selectable ? (
                  <span className="flex py-3 pl-3">
                    <Checkbox
                      aria-label={messages.selectRow(key)}
                      checked={selected}
                      disabled={!(isRowSelectable?.(row) ?? true)}
                      onCheckedChange={(checked) => {
                        changeSelection(
                          checked === true
                            ? [...selection, key]
                            : selection.filter((item) => item !== key),
                        );
                      }}
                    />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">{renderMobileRow(row, index)}</div>
              </li>
            );
          })}
        </ul>
      </div>
      {showEmpty ? (
        <div className="text-muted-foreground py-10 text-center">{empty ?? messages.empty}</div>
      ) : null}
    </>
  );
}

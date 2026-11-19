import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select/select";
import { Tooltip } from "../tooltip/tooltip";

/** What the list holds, in the singular and the plural: "contact" and "contacts". */
export interface PaginationNoun {
  one: string;
  other: string;
}

/** Where a paged list is, and how to move. `QueryList` hands this over as `pagination`. */
export interface PaginationState {
  /** The page on screen, starting at 1. */
  page: number;
  /** How many items a full page holds. Without it the summary cannot say which items show. */
  pageSize: number | undefined;
  /** The number of items across every page, when the server knows it. */
  total: number | undefined;
  /** How many items are on screen. */
  itemCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  setPage: (page: number) => void;
}

export interface PaginationMessages {
  /** The name of the navigation landmark. */
  label: string;
  previous: string;
  next: string;
  /** The rows-per-page picker's name. */
  pageSize: string;
  loadMore: string;
}

/** The sizes the rows-per-page picker offers when a list does not choose its own. */
export const defaultPageSizeOptions: readonly number[] = [10, 25, 50, 100];

export interface PaginationProps {
  pagination: PaginationState;
  /** Used when everything fits on one page: "4 contacts". Default "item" and "items". */
  noun?: PaginationNoun | undefined;
  /**
   * `pages` moves a page at a time with previous and next. `load-more` suits a narrow screen:
   * one button that adds the next page under the rows already shown.
   */
  mode?: "pages" | "load-more" | undefined;
  /** Called by the Load more button. */
  onLoadMore?: (() => void) | undefined;
  /** True while the next page is on its way, which puts a spinner on Load more. */
  loadingMore?: boolean | undefined;
  /**
   * The sizes the rows-per-page picker offers. The picker shows only with `onPageSizeChange`
   * and a known `pageSize`; pass `false` or an empty list to leave it out.
   */
  pageSizeOptions?: readonly number[] | false | undefined;
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
  /** Shows "1–25 of 132" on the left. Default true. */
  showSummary?: boolean | undefined;
  /** Shows previous and next, or Load more. Default true. */
  showControls?: boolean | undefined;
  messages?: Partial<PaginationMessages>;
  className?: string;
}

const defaultNoun: PaginationNoun = { one: "item", other: "items" };

const defaultMessages: PaginationMessages = {
  label: "Pagination",
  previous: "Previous page",
  next: "Next page",
  pageSize: "Rows per page",
  loadMore: "Load more",
};

// A fixed locale, so the page reads the same on the server as in the browser.
const numberFormat = new Intl.NumberFormat("en-US");

function count(total: number | undefined, itemCount: number, noun: PaginationNoun): string {
  const value = total ?? itemCount;
  return `${numberFormat.format(value)} ${value === 1 ? noun.one : noun.other}`;
}

/** "1–25 of 132", or "4 contacts" when there is only one page. */
export function paginationSummary(
  { page, pageSize, total, itemCount, hasPrevious, hasNext }: PaginationState,
  noun: PaginationNoun = defaultNoun,
): string {
  if (!hasPrevious && !hasNext) {
    return count(total, itemCount, noun);
  }
  if (pageSize === undefined) {
    return `Page ${numberFormat.format(page)}`;
  }
  const first = (page - 1) * pageSize + 1;
  const last = first + Math.max(itemCount, 1) - 1;
  const range = `${numberFormat.format(first)}–${numberFormat.format(last)}`;
  return total === undefined ? range : `${range} of ${numberFormat.format(total)}`;
}

/** "Showing 50 of 132" while more can be loaded, or "132 contacts" once every one is shown. */
export function loadMoreSummary(
  { total, itemCount, hasPrevious, hasNext }: PaginationState,
  noun: PaginationNoun = defaultNoun,
): string {
  if (!hasPrevious && !hasNext) {
    return count(total, itemCount, noun);
  }
  const shown = numberFormat.format(itemCount);
  return total === undefined
    ? `Showing ${shown}`
    : `Showing ${shown} of ${numberFormat.format(total)}`;
}

/**
 * The footer of a paged list or table: how many there are on the left; the rows-per-page
 * picker and previous and next on the right, or Load more on a phone. It shows even when
 * everything fits on one page, so the count is always there. It hides while there is nothing
 * to count and no earlier page to go back to, and when every part of it is turned off.
 */
export function Pagination({
  pagination,
  noun,
  mode = "pages",
  onLoadMore,
  loadingMore = false,
  pageSizeOptions = defaultPageSizeOptions,
  onPageSizeChange,
  showSummary = true,
  showControls = true,
  messages,
  className,
}: PaginationProps) {
  const { page, pageSize, itemCount, hasPrevious, hasNext, setPage } = pagination;
  const text = { ...defaultMessages, ...messages };
  const sizes = pageSizeOptions === false ? [] : pageSizeOptions;
  const showPicker = sizes.length > 0 && onPageSizeChange !== undefined && pageSize !== undefined;
  if ((itemCount === 0 && !hasPrevious) || (!showSummary && !showControls && !showPicker)) {
    return null;
  }
  // The size on screen stays a choice even when the list was given one the picker lacks.
  const choices = pageSize === undefined || sizes.includes(pageSize) ? sizes : [...sizes, pageSize];
  return (
    <nav
      aria-label={text.label}
      data-slot="pagination"
      data-mode={mode}
      className={cn(
        "border-rule flex h-11 shrink-0 items-center justify-between gap-3 border-t px-3",
        className,
      )}
    >
      {showSummary ? (
        <p
          className="text-muted-foreground min-w-0 truncate text-xs tabular-nums"
          aria-live="polite"
        >
          {mode === "load-more"
            ? loadMoreSummary(pagination, noun)
            : paginationSummary(pagination, noun)}
        </p>
      ) : (
        // Keeps the controls on the right when there is no summary to push them there.
        <span />
      )}
      <div className="flex shrink-0 items-center gap-1.5">
        {showPicker ? (
          <div className="flex items-center gap-2">
            {/* On a phone the number alone says enough; the picker keeps its name for screen readers. */}
            <span aria-hidden="true" className="text-muted-foreground text-xs max-sm:hidden">
              {text.pageSize}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger
                aria-label={text.pageSize}
                className="w-auto gap-1 px-2 text-xs tabular-nums data-[size=default]:h-8 md:text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-20">
                {choices.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs tabular-nums">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {showControls && mode === "load-more" && hasNext ? (
          <Button variant="secondary" size="sm" onClick={onLoadMore} loading={loadingMore}>
            {text.loadMore}
          </Button>
        ) : null}
        {showControls && mode === "pages" ? (
          <>
            <Tooltip content={text.previous}>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={text.previous}
                disabled={!hasPrevious}
                onClick={() => {
                  setPage(page - 1);
                }}
              >
                <Icon name="caret-left" />
              </Button>
            </Tooltip>
            <Tooltip content={text.next}>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={text.next}
                disabled={!hasNext}
                onClick={() => {
                  setPage(page + 1);
                }}
              >
                <Icon name="caret-right" />
              </Button>
            </Tooltip>
          </>
        ) : null}
      </div>
    </nav>
  );
}

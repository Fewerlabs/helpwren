import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
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
  /** How many items are on the page on screen. */
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
}

export interface PaginationProps {
  pagination: PaginationState;
  /** Used when everything fits on one page: "4 contacts". Default "item" and "items". */
  noun?: PaginationNoun;
  messages?: Partial<PaginationMessages>;
  className?: string;
}

const defaultNoun: PaginationNoun = { one: "item", other: "items" };

const defaultMessages: PaginationMessages = {
  label: "Pagination",
  previous: "Previous page",
  next: "Next page",
};

// A fixed locale, so the page reads the same on the server as in the browser.
const numberFormat = new Intl.NumberFormat("en-US");

/** "1–25 of 132", or "4 contacts" when there is only one page. */
export function paginationSummary(
  { page, pageSize, total, itemCount, hasPrevious, hasNext }: PaginationState,
  noun: PaginationNoun = defaultNoun,
): string {
  if (!hasPrevious && !hasNext) {
    const count = total ?? itemCount;
    return `${numberFormat.format(count)} ${count === 1 ? noun.one : noun.other}`;
  }
  if (pageSize === undefined) {
    return `Page ${numberFormat.format(page)}`;
  }
  const first = (page - 1) * pageSize + 1;
  const last = first + Math.max(itemCount, 1) - 1;
  const range = `${numberFormat.format(first)}–${numberFormat.format(last)}`;
  return total === undefined ? range : `${range} of ${numberFormat.format(total)}`;
}

/**
 * The footer of a paged list or table: how many there are on the left, previous and next on
 * the right. It shows even when everything fits on one page, so the count is always there.
 * It hides only while there is nothing to count and no earlier page to go back to.
 */
export function Pagination({ pagination, noun, messages, className }: PaginationProps) {
  const { page, itemCount, hasPrevious, hasNext, setPage } = pagination;
  const text = { ...defaultMessages, ...messages };
  if (itemCount === 0 && !hasPrevious) {
    return null;
  }
  return (
    <nav
      aria-label={text.label}
      data-slot="pagination"
      className={cn(
        "border-rule flex h-11 shrink-0 items-center justify-between gap-3 border-t px-3",
        className,
      )}
    >
      <p className="text-muted-foreground min-w-0 truncate text-xs tabular-nums" aria-live="polite">
        {paginationSummary(pagination, noun)}
      </p>
      <div className="flex shrink-0 gap-1.5">
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
      </div>
    </nav>
  );
}

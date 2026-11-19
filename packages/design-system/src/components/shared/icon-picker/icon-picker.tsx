"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "#lib/cn";

import { Button } from "../../base/button/button";
import { CollectionIcon } from "../../base/collection-icon/collection-icon";
import { Skeleton } from "../../base/skeleton/skeleton";
import { focusRing } from "../../base/styles";
import { Tooltip } from "../../base/tooltip/tooltip";
import { EmptyState } from "../empty-state/empty-state";
import { SearchField } from "../search-field/search-field";
import { nextIndex } from "./navigation";
import { matchIcons, type IconEntry } from "./search";

export interface IconPickerProps {
  /** Names the grid of icons for assistive technology, such as "Icon". */
  label: string;
  /** The chosen icon's Phosphor name, such as `rocket-launch`. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** The accessible name of the search field. */
  searchLabel?: string;
  /** Set by `Field`: it goes on the search field, so the field's label focuses it. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

const TILE = 36;
const GAP = 4;
const ROW = TILE + GAP;
/** The grid is never taller than this many rows; the rest scroll inside it. */
const MAX_ROWS = 4;
/** Room around the tiles for the focus outline, which the scrolling box would clip. */
const PAD = 4;

type Catalogue = readonly IconEntry[];

let loading: Promise<Catalogue> | null = null;

// The whole set of icons is a large module, so it is fetched the first time a picker opens and
// shared by every picker after that. A failed fetch is forgotten, so trying again fetches anew.
function loadCatalogue(): Promise<Catalogue> {
  loading ??= import("./catalogue").then(
    (module) => module.catalogue,
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

type CatalogueState =
  { status: "loading" } | { status: "ready"; icons: Catalogue } | { status: "failed" };

function useCatalogue(): [CatalogueState, () => void] {
  const [state, setState] = useState<CatalogueState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    loadCatalogue().then(
      (icons) => {
        if (live) setState({ status: "ready", icons });
      },
      () => {
        if (live) setState({ status: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((count) => count + 1);
  }, []);
  return [state, retry];
}

const NO_ICONS: Catalogue = [];

/**
 * Every Phosphor icon to choose one from, with a search above. Search finds icons by name and
 * by what they show, so "money" finds coins and wallets. The grid is four rows high and
 * scrolls inside itself; only the rows in view are drawn, so its 1,500 icons stay quick. It is
 * one listbox: arrow keys move, Enter or Space picks, Home and End jump to the ends, and Down
 * from the search field moves into it.
 */
export function IconPicker({
  label,
  value,
  onChange,
  disabled = false,
  searchLabel = "Search icons",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  className,
}: IconPickerProps) {
  const listId = useId();
  const [catalogue, retry] = useCatalogue();
  const [query, setQuery] = useState("");
  // The tile keyboard focus is on, by name, so it survives the list changing under it.
  const [activeName, setActiveName] = useState(value);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const search = useRef<HTMLInputElement | null>(null);
  const focusActive = useRef(false);
  const scrolledToChoice = useRef(false);

  const icons = catalogue.status === "ready" ? catalogue.icons : NO_ICONS;
  const matches = useMemo(() => matchIcons(icons, query), [icons, query]);
  const columns = Math.max(1, Math.floor((width + GAP) / ROW));
  const rows = Math.ceil(matches.length / columns);
  const found = matches.findIndex((entry) => entry.name === activeName);
  const active = found === -1 ? 0 : found;
  const chosen = matches.findIndex((entry) => entry.name === value || entry.alias === value);

  // A callback ref, so the box is measured as soon as it exists, before any resize is seen.
  const measure = useCallback((node: HTMLDivElement | null) => {
    setScroller(node);
    setWidth(node?.clientWidth ? node.clientWidth - 2 * PAD : 0);
  }, []);

  useEffect(() => {
    if (!scroller || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(scroller);
    return () => {
      observer.disconnect();
    };
  }, [scroller]);

  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer changes in place as the grid scrolls, so this component must re-render with it rather than be memoised.
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scroller,
    estimateSize: () => ROW,
    overscan: 2,
    paddingStart: PAD,
    paddingEnd: PAD - GAP,
    scrollPaddingStart: PAD,
    scrollPaddingEnd: PAD,
  });

  // The chosen icon starts in view: in the middle of the grid, once the icons are in.
  useEffect(() => {
    if (scrolledToChoice.current || matches.length === 0 || width === 0) return;
    scrolledToChoice.current = true;
    if (chosen > 0) virtualizer.scrollToIndex(Math.floor(chosen / columns), { align: "center" });
  }, [chosen, columns, matches.length, virtualizer, width]);

  // A tile moved to with the keyboard may only be drawn once the grid has scrolled to it, so
  // focus waits for the render that draws it.
  useEffect(() => {
    if (!focusActive.current || !scroller) return;
    const tile = scroller.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!tile) return;
    focusActive.current = false;
    tile.focus({ preventScroll: true });
  });

  function moveTo(index: number) {
    const entry = matches[index];
    if (!entry) return;
    setActiveName(entry.name);
    virtualizer.scrollToIndex(Math.floor(index / columns));
    const tile = scroller?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (tile) tile.focus({ preventScroll: true });
    else focusActive.current = true;
  }

  function pick(entry: IconEntry) {
    if (disabled) return;
    setActiveName(entry.name);
    onChange(entry.name);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      moveTo(active);
    } else if (event.key === "Enter") {
      // Enter here would send the form the picker sits in. It picks the best match instead.
      event.preventDefault();
      const best = matches[0];
      if (query.trim() !== "" && best) pick(best);
    }
  }

  function onTileKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextIndex(event.key, active, matches.length, columns, MAX_ROWS);
    if (next !== null) {
      event.preventDefault();
      moveTo(next);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      search.current?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const entry = matches[active];
      if (entry) pick(entry);
    }
  }

  const shownRows = catalogue.status === "ready" ? Math.min(rows, MAX_ROWS) : MAX_ROWS;
  const height = shownRows * ROW - GAP + 2 * PAD;
  const trimmed = query.trim();

  return (
    <div data-slot="icon-picker" className={cn("grid min-w-0 gap-2", className)}>
      <SearchField
        ref={search}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-label={searchLabel}
        aria-controls={catalogue.status === "ready" && rows > 0 ? listId : undefined}
        placeholder="Search icons"
        autoComplete="off"
        disabled={disabled || catalogue.status === "failed"}
        value={query}
        onValueChange={(next) => {
          setQuery(next);
          virtualizer.scrollToOffset(0);
        }}
        onKeyDown={onSearchKeyDown}
      />
      <div
        ref={measure}
        className={cn(
          "overflow-y-auto overscroll-contain px-1",
          (catalogue.status === "failed" || (catalogue.status === "ready" && rows === 0)) &&
            "hidden",
        )}
        style={{ height }}
      >
        {catalogue.status === "loading" ? (
          <div
            className="grid gap-1 overflow-hidden py-1"
            style={{ gridTemplateColumns: `repeat(${columns}, ${TILE}px)` }}
            aria-busy="true"
          >
            <span className="sr-only">Loading icons</span>
            {Array.from({ length: columns * MAX_ROWS }, (_, index) => (
              <Skeleton key={index} className="size-9 rounded-lg" />
            ))}
          </div>
        ) : (
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            aria-disabled={disabled || undefined}
            className="relative"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((row) => (
              <div
                key={row.key}
                role="none"
                className="absolute inset-x-0 top-0 grid justify-between gap-1"
                style={{
                  gridTemplateColumns: `repeat(${columns}, ${TILE}px)`,
                  transform: `translateY(${row.start}px)`,
                }}
              >
                {matches
                  .slice(row.index * columns, (row.index + 1) * columns)
                  .map((entry, column) => {
                    const index = row.index * columns + column;
                    const selected = index === chosen;
                    return (
                      <Tooltip key={entry.name} content={entry.label}>
                        <div
                          role="option"
                          data-index={index}
                          aria-label={entry.label}
                          aria-selected={selected}
                          aria-posinset={index + 1}
                          aria-setsize={matches.length}
                          aria-disabled={disabled || undefined}
                          tabIndex={index === active ? 0 : -1}
                          className={cn(
                            "border-rule grid size-9 cursor-pointer place-items-center rounded-lg border transition-colors",
                            focusRing,
                            selected
                              ? "border-foreground bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            disabled && "cursor-not-allowed opacity-50",
                          )}
                          onKeyDown={onTileKeyDown}
                          onClick={() => {
                            pick(entry);
                          }}
                          onFocus={() => {
                            setActiveName(entry.name);
                          }}
                        >
                          <CollectionIcon name={entry.name} className="size-4.5" />
                        </div>
                      </Tooltip>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </div>
      {catalogue.status === "ready" && rows === 0 ? (
        <EmptyState
          size="sm"
          scene={false}
          headingLevel={3}
          title={`No icons match “${trimmed}”`}
          description="Try a word for what it shows, such as money or arrow."
        />
      ) : null}
      {catalogue.status === "failed" ? (
        <EmptyState
          size="sm"
          scene={false}
          headingLevel={3}
          title="The icons could not be loaded"
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {catalogue.status === "ready" && trimmed !== ""
          ? `${matches.length} ${matches.length === 1 ? "icon" : "icons"}`
          : ""}
      </p>
    </div>
  );
}

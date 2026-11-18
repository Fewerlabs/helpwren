"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type FocusEventHandler,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "#lib/cn";

import { ControlShell } from "../control-shell/control-shell";
import { Icon } from "../icon/icon";
import { Popover, PopoverAnchor, PopoverContent } from "../popover/popover";
import { Spinner } from "../spinner/spinner";
import { bareInput, focusRing } from "../styles";
import { Chip } from "../tags-input/chip";
import { useAsyncOptions, type ComboboxLoader } from "./use-async-options";
import { useResolvedOptions, type ComboboxResolver } from "./use-resolved-options";

/** The option shape used when you do not pass `getOptionValue` and `getOptionLabel`. */
export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxOptionState {
  selected: boolean;
  active: boolean;
  disabled: boolean;
}

export interface ComboboxMessages {
  empty: ReactNode;
  loading: string;
  loadingMore: string;
  error: ReactNode;
  retry: string;
  clear: string;
  toggle: string;
  /** Shown in place of a selected value while its option is being looked up. */
  resolving: string;
  remove: (label: string) => string;
}

const defaultMessages: ComboboxMessages = {
  empty: "No results",
  loading: "Loading",
  loadingMore: "Loading more",
  error: "The options could not be loaded.",
  retry: "Try again",
  clear: "Clear",
  toggle: "Show options",
  resolving: "Loading…",
  remove: (label) => `Remove ${label}`,
};

/** Everything except the value, which differs between single and multiple mode. */
export interface ComboboxBaseProps<Option, Value, Cursor> extends Pick<
  AriaAttributes,
  "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "aria-required"
> {
  /** A fixed list, filtered in the browser. Use `loadOptions` instead for server-side data. */
  options?: readonly Option[];
  /**
   * Loads options from a server, one page at a time. It is called with the search text
   * and a cursor; return `nextCursor` to enable infinite scrolling.
   */
  loadOptions?: ComboboxLoader<Option, Cursor>;
  /**
   * Looks up options by value. It is called once with every selected value that is not
   * in a loaded list, so a form prefilled with ids can show their labels.
   */
  resolveOptions?: ComboboxResolver<Option, Value>;
  /** Options you already hold for the selected values. They skip `resolveOptions`. */
  selectedOptions?: readonly Option[];
  getOptionValue?: (option: Option) => Value;
  getOptionLabel?: (option: Option) => string;
  isOptionDisabled?: (option: Option) => boolean;
  /** Decides whether an option of the fixed list matches the search. */
  filter?: (option: Option, search: string) => boolean;
  /** Replaces the content of a row in the list. */
  renderOption?: (option: Option, state: ComboboxOptionState) => ReactNode;
  /** Replaces how a selected option is shown in the box (and in each chip when `multiple`). */
  renderValue?: (option: Option) => ReactNode;
  /** Content before the value, inside the box. */
  prepend?: ReactNode;
  /** Content under the list, such as a "Create new" button. */
  footer?: ReactNode;
  /** Allows typing to search. Default true. */
  searchable?: boolean;
  /** Shows a button that removes the selection. Default false. */
  clearable?: boolean;
  /** How long to wait after typing before calling `loadOptions`. Default 250ms. */
  debounceMs?: number;
  messages?: Partial<ComboboxMessages>;
  placeholder?: string;
  disabled?: boolean;
  /** Submits the selected value or values with a form. */
  name?: string;
  id?: string;
  className?: string;
  listClassName?: string;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (search: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
}

interface SingleProps<Option, Value> {
  multiple?: false;
  value?: Value | null;
  defaultValue?: Value | null;
  onValueChange?: (value: Value | null, option: Option | null) => void;
}

interface MultipleProps<Option, Value> {
  /** Allows several values, shown as removable chips in a box that grows. */
  multiple: true;
  value?: readonly Value[];
  defaultValue?: readonly Value[];
  onValueChange?: (value: Value[], options: Option[]) => void;
}

export type ComboboxProps<
  Option = ComboboxOption,
  Value extends string | number = string,
  Cursor = unknown,
> = ComboboxBaseProps<Option, Value, Cursor> &
  (SingleProps<Option, Value> | MultipleProps<Option, Value>);

function property(option: unknown, key: string): unknown {
  return typeof option === "object" && option !== null && key in option
    ? (option as Record<string, unknown>)[key]
    : option;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function defaultGetValue(option: unknown): unknown {
  return property(option, "value");
}

function defaultGetLabel(option: unknown): string {
  return text(property(option, "label"));
}

function defaultIsDisabled(option: unknown): boolean {
  return property(option, "disabled") === true;
}

function toArray<Value>(value: Value | readonly Value[] | null | undefined): readonly Value[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? (value as readonly Value[]) : [value as Value];
}

/**
 * A searchable select. It filters a fixed list, or loads options from a server with
 * search and infinite scrolling, in single or multiple mode. Selected values that are
 * not in a loaded list are looked up through `resolveOptions`.
 */
export function Combobox<
  Option = ComboboxOption,
  Value extends string | number = string,
  Cursor = unknown,
>(props: ComboboxProps<Option, Value, Cursor>) {
  const {
    options: staticOptions,
    loadOptions,
    resolveOptions,
    selectedOptions,
    getOptionValue: valueOf = defaultGetValue as (option: Option) => Value,
    getOptionLabel = defaultGetLabel,
    isOptionDisabled = defaultIsDisabled,
    filter,
    renderOption,
    renderValue,
    prepend,
    footer,
    searchable = true,
    clearable = false,
    debounceMs = 250,
    messages: messageOverrides,
    placeholder,
    disabled = false,
    name,
    id,
    className,
    listClassName,
    onOpenChange,
    onSearchChange,
    onBlur,
    onFocus,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
  } = props;
  const multiple = props.multiple === true;
  const messages = { ...defaultMessages, ...messageOverrides };

  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [internal, setInternal] = useState<readonly Value[]>(() => toArray(props.defaultValue));
  const selected = props.value === undefined ? internal : toArray<Value>(props.value);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  // Options the person chose, kept so their labels survive a later search.
  const [picked, setPicked] = useState<ReadonlyMap<Value, Option>>(new Map());

  const async = useAsyncOptions<Option, Cursor>({
    loader: loadOptions,
    search,
    enabled: open,
    debounceMs,
  });

  const list = useMemo(() => {
    const source = loadOptions
      ? async.options
      : (staticOptions ?? []).filter((option) => {
          if (search === "") {
            return true;
          }
          return filter
            ? filter(option, search)
            : getOptionLabel(option).toLowerCase().includes(search.toLowerCase());
        });
    const seen = new Set<Value>();
    return source.filter((option) => {
      const value = valueOf(option);
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }, [loadOptions, async.options, staticOptions, search, valueOf, getOptionLabel, filter]);

  const loaded = useMemo(() => {
    const map = new Map<Value, Option>();
    for (const option of [...(staticOptions ?? []), ...async.options, ...(selectedOptions ?? [])]) {
      map.set(valueOf(option), option);
    }
    for (const [value, option] of picked) {
      map.set(value, option);
    }
    return map;
  }, [staticOptions, async.options, selectedOptions, picked, valueOf]);

  const isKnown = useCallback((value: Value) => loaded.has(value), [loaded]);
  const { resolved, pending } = useResolvedOptions<Option, Value>({
    values: selected,
    isKnown,
    resolver: resolveOptions,
    getOptionValue: valueOf,
  });

  const optionFor = (value: Value) => loaded.get(value) ?? resolved.get(value);
  const labelFor = (value: Value) => {
    const option = optionFor(value);
    if (option !== undefined) {
      return getOptionLabel(option);
    }
    return pending.has(value) ? messages.resolving : String(value);
  };

  const active = list.length === 0 ? -1 : Math.min(activeIndex, list.length - 1);
  const singleValue = multiple ? undefined : selected[0];
  const singleOption = singleValue === undefined ? undefined : optionFor(singleValue);
  const singleLabel = singleValue === undefined ? "" : labelFor(singleValue);
  const customValue =
    !multiple && !open && singleOption !== undefined && renderValue
      ? renderValue(singleOption)
      : undefined;

  function changeOpen(next: boolean) {
    if (next === open || (next && disabled)) {
      return;
    }
    setOpen(next);
    onOpenChange?.(next);
    if (next) {
      const current = list.findIndex((option) => selected.includes(valueOf(option)));
      setActiveIndex(Math.max(current, 0));
    } else {
      changeSearch("");
      setActiveIndex(-1);
    }
  }

  function changeSearch(next: string) {
    if (next !== search) {
      setSearch(next);
      onSearchChange?.(next);
    }
  }

  function emit(next: readonly Value[], justPicked?: Option) {
    if (props.value === undefined) {
      setInternal(next);
    }
    const chosen = next.flatMap((value) => {
      // An option picked in this event is not in `loaded` until the next render.
      const option =
        justPicked !== undefined && valueOf(justPicked) === value ? justPicked : optionFor(value);
      return option === undefined ? [] : [option];
    });
    if (props.multiple === true) {
      props.onValueChange?.([...next], chosen);
    } else {
      props.onValueChange?.(next[0] ?? null, chosen[0] ?? null);
    }
  }

  function choose(option: Option) {
    if (isOptionDisabled(option)) {
      return;
    }
    const value = valueOf(option);
    setPicked((previous) => new Map(previous).set(value, option));
    if (multiple) {
      emit(
        selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
        option,
      );
      changeSearch("");
    } else {
      emit([value], option);
      changeOpen(false);
    }
  }

  function move(step: 1 | -1) {
    const start = active < 0 && step === -1 ? 0 : active;
    const next = list
      .map((_, offset) => (start + step * (offset + 1) + list.length * 2) % list.length)
      .find((index) => {
        const option = list[index];
        return option !== undefined && !isOptionDisabled(option);
      });
    if (next !== undefined) {
      setActiveIndex(next);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (open) {
          move(event.key === "ArrowDown" ? 1 : -1);
        } else {
          changeOpen(true);
        }
        break;
      }
      case "Enter": {
        const option = open ? list[active] : undefined;
        if (option !== undefined) {
          event.preventDefault();
          choose(option);
        }
        break;
      }
      case "Backspace": {
        if (multiple && search === "" && selected.length > 0) {
          emit(selected.slice(0, -1));
        }
        break;
      }
      case "Tab": {
        changeOpen(false);
        break;
      }
      default:
    }
  }

  useEffect(() => {
    if (open && active >= 0) {
      document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active, baseId]);

  const { hasMore, loadMore } = async;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!open || !hasMore || !sentinel || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root: scrollRef.current, rootMargin: "48px" },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [open, hasMore, loadMore, list.length]);

  const inputText = multiple || open ? search : customValue === undefined ? singleLabel : "";
  const inputPlaceholder =
    !multiple && open && singleLabel !== ""
      ? singleLabel
      : selected.length === 0
        ? placeholder
        : undefined;
  const showEmpty = list.length === 0 && async.status === "idle";
  const busy = async.status === "loading" || async.status === "loading-more";
  const loadingLabel = async.status === "loading-more" ? messages.loadingMore : messages.loading;

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverAnchor asChild>
        <ControlShell
          ref={shellRef}
          data-slot="combobox"
          role="group"
          aria-disabled={disabled || undefined}
          data-state={open ? "open" : "closed"}
          className={cn(
            "gap-1.5 py-(--hw-control-pad,0.25rem) pr-1.5 pl-3",
            multiple && "pl-2",
            className,
          )}
        >
          {/* While options load, the spinner takes the place of the leading icon. */}
          {prepend === undefined ? null : (
            <span className="text-muted-foreground flex shrink-0 items-center">
              {busy ? <Spinner label={loadingLabel} /> : prepend}
            </span>
          )}
          {/* Chips and the input wrap together; the buttons after them stay on the first line. */}
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {multiple
              ? selected.map((value) => {
                  const option = optionFor(value);
                  const label = labelFor(value);
                  return (
                    <Chip
                      key={value}
                      removeLabel={messages.remove(label)}
                      disabled={disabled}
                      onRemove={() => {
                        emit(selected.filter((item) => item !== value));
                        inputRef.current?.focus();
                      }}
                    >
                      {option !== undefined && renderValue ? renderValue(option) : label}
                    </Chip>
                  );
                })
              : null}
            <span className="relative flex min-w-16 flex-1 items-center">
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                id={id}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
                autoComplete="off"
                disabled={disabled}
                readOnly={!searchable}
                value={inputText}
                placeholder={inputPlaceholder}
                onChange={(event) => {
                  changeSearch(event.target.value);
                  changeOpen(true);
                  setActiveIndex(0);
                }}
                onClick={() => {
                  changeOpen(!open);
                }}
                onKeyDown={handleKeyDown}
                onBlur={onBlur}
                onFocus={onFocus}
                className={cn(bareInput, "h-7 w-full", !searchable && "cursor-default")}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                aria-invalid={ariaInvalid}
                aria-required={ariaRequired}
              />
              {customValue === undefined ? null : (
                <span className="pointer-events-none absolute inset-0 flex items-center truncate">
                  {customValue}
                </span>
              )}
            </span>
          </span>
          {clearable && selected.length > 0 && !disabled ? (
            <button
              type="button"
              aria-label={messages.clear}
              onClick={() => {
                emit([]);
                inputRef.current?.focus();
              }}
              className={cn(
                "text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md",
                focusRing,
              )}
            >
              <Icon name="x" className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            tabIndex={-1}
            aria-label={messages.toggle}
            aria-expanded={open}
            disabled={disabled}
            onClick={() => {
              changeOpen(!open);
              inputRef.current?.focus();
            }}
            className="text-muted-foreground flex size-7 shrink-0 items-center justify-center"
          >
            {/* With no leading icon, the spinner takes the caret's place instead. */}
            {busy && prepend === undefined ? (
              <Spinner label={loadingLabel} />
            ) : (
              <Icon
                name="caret-down"
                className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
              />
            )}
          </button>
          {name === undefined
            ? null
            : selected.map((value) => (
                <input key={value} type="hidden" name={name} value={value} />
              ))}
        </ControlShell>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) min-w-48 gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          // Focus stays in the input, which drives the list through aria-activedescendant.
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (event.target instanceof Node && shellRef.current?.contains(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <div ref={scrollRef} className={cn("max-h-64 overflow-y-auto p-1", listClassName)}>
          <div
            id={listId}
            role="listbox"
            aria-label={ariaLabel ?? placeholder ?? messages.toggle}
            aria-multiselectable={multiple || undefined}
            aria-busy={async.status === "loading" || undefined}
          >
            {list.map((option, index) => {
              const value = valueOf(option);
              const state: ComboboxOptionState = {
                selected: selected.includes(value),
                active: index === active,
                disabled: isOptionDisabled(option),
              };
              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- options are operated from the input through aria-activedescendant; they never take focus themselves.
                <div
                  key={value}
                  id={optionId(index)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={state.selected}
                  aria-disabled={state.disabled || undefined}
                  data-active={state.active || undefined}
                  onMouseMove={() => {
                    if (!state.disabled && index !== active) {
                      setActiveIndex(index);
                    }
                  }}
                  onMouseDown={(event) => {
                    // Keeps focus in the input.
                    event.preventDefault();
                  }}
                  onClick={() => {
                    choose(option);
                  }}
                  className={cn(
                    "flex min-h-9 cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm select-none",
                    "data-active:bg-accent data-active:text-accent-foreground",
                    "aria-disabled:text-muted-foreground aria-disabled:cursor-not-allowed",
                  )}
                >
                  {renderOption ? (
                    renderOption(option, state)
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">{getOptionLabel(option)}</span>
                      {state.selected ? <Icon name="check" className="size-4 shrink-0" /> : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          <div aria-live="polite" className="text-muted-foreground text-sm">
            {busy && list.length === 0 ? <p className="px-2 py-2">{messages.loading}</p> : null}
            {/* The next page arrives at the bottom of the list, so that is where it says so. */}
            {async.status === "loading-more" ? (
              <p className="flex items-center justify-center gap-2 px-2 py-3 text-xs">
                <Spinner label="" aria-hidden="true" />
                {messages.loadingMore}
              </p>
            ) : null}
            {async.status === "error" ? (
              <p className="flex flex-wrap items-center gap-2 px-2 py-2">
                <span className="text-destructive">{messages.error}</span>
                <button
                  type="button"
                  onClick={async.retry}
                  className={cn("text-biro rounded-sm underline underline-offset-4", focusRing)}
                >
                  {messages.retry}
                </button>
              </p>
            ) : null}
            {showEmpty ? <p className="px-2 py-2">{messages.empty}</p> : null}
          </div>
        </div>
        {footer === undefined ? null : <div className="border-rule border-t p-1">{footer}</div>}
      </PopoverContent>
    </Popover>
  );
}

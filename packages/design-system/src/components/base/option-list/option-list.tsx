"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";

export interface OptionListOption {
  value: string;
  /** The option's name: what is searched, and what is read out. */
  label: string;
  /** What to show for the option, when its name alone is not enough: an avatar, a chip, a dot. */
  content?: ReactNode;
  disabled?: boolean;
}

export interface OptionListProps {
  /** Names the list for assistive technology, such as "Assignee". */
  label: string;
  options: readonly OptionListOption[];
  /** The values that are chosen. One, for a single choice; any number, with `multiple`. */
  selected: readonly string[];
  /** Called with the value that was picked. With `multiple`, picking a chosen value unpicks it. */
  onPick: (value: string) => void;
  multiple?: boolean;
  /** Shows a box to filter the options by name. Default: when there are more than seven. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shown when no option matches the search. */
  emptyText?: string;
  className?: string;
}

const SEARCH_FROM = 8;

/**
 * A list to choose from, with an optional search box, driven from the keyboard: arrows move,
 * Enter picks. It is the inside of `InlineSelect` and `FilterBar`; use those unless you are
 * building another control like them.
 */
export function OptionList({
  label,
  options,
  selected,
  onPick,
  multiple = false,
  searchable = options.length >= SEARCH_FROM,
  searchPlaceholder = "Search",
  emptyText = "Nothing found",
  className,
}: OptionListProps) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement | null>(null);

  // Without a search box the list itself takes the keyboard, as soon as it opens.
  useEffect(() => {
    if (!searchable) list.current?.focus();
  }, [searchable]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
  }, [options, search]);
  // Typing can shorten the list under the highlighted row.
  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0));
  const activeOption = visible[activeIndex];

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + visible.length) % Math.max(visible.length, 1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : visible.length - 1);
    } else if (event.key === "Enter" || (event.key === " " && !searchable)) {
      event.preventDefault();
      if (activeOption && !activeOption.disabled) onPick(activeOption.value);
    }
  }

  const optionId = (value: string) => `${id}-${value}`;
  const listProps = {
    id: `${id}-list`,
    role: "listbox",
    "aria-label": label,
    "aria-multiselectable": multiple || undefined,
  } as const;

  return (
    <div className={cn("flex max-h-72 min-w-44 flex-col text-sm", className)}>
      {searchable ? (
        <div className="border-rule flex items-center gap-2 border-b px-3">
          <Icon name="magnifying-glass" className="text-muted-foreground size-3.5" />
          <input
            // The list opens in answer to a click, so the search box is where typing should land.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            role="combobox"
            aria-label={`Search ${label.toLowerCase()}`}
            aria-expanded="true"
            aria-controls={listProps.id}
            aria-activedescendant={activeOption ? optionId(activeOption.value) : undefined}
            className="placeholder:text-muted-foreground h-9 min-w-0 flex-1 bg-transparent outline-none"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : null}
      <div
        {...listProps}
        // Without a search box the list itself takes the keyboard.
        {...(searchable
          ? {}
          : {
              ref: list,
              tabIndex: 0,
              "aria-activedescendant": activeOption ? optionId(activeOption.value) : undefined,
              onKeyDown,
            })}
        className="min-h-0 flex-1 overflow-y-auto py-1 outline-none"
      >
        {visible.map((option, index) => {
          const chosen = selected.includes(option.value);
          return (
            // The list is driven from the keyboard through aria-activedescendant, above.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              key={option.value}
              id={optionId(option.value)}
              role="option"
              // Focus stays on the search box or the list; the highlighted row is announced
              // through aria-activedescendant.
              tabIndex={-1}
              aria-selected={chosen}
              aria-disabled={option.disabled}
              data-active={index === activeIndex || undefined}
              className={cn(
                "data-active:bg-muted flex min-h-8 cursor-default items-center gap-2 px-3 py-1.5 select-none",
                option.disabled && "pointer-events-none opacity-50",
              )}
              onPointerMove={() => {
                setActive(index);
              }}
              onClick={() => {
                onPick(option.value);
              }}
            >
              {multiple ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "border-line grid size-4 shrink-0 place-items-center rounded-sm",
                    chosen
                      ? "border-primary bg-primary-fill text-primary-fill-foreground"
                      : "border-input",
                  )}
                >
                  {chosen ? <Icon name="check" weight="bold" className="size-3" /> : null}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                {option.content ?? option.label}
              </span>
              {!multiple && chosen ? <Icon name="check" className="size-4 shrink-0" /> : null}
            </div>
          );
        })}
        {visible.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2">{emptyText}</p>
        ) : null}
      </div>
    </div>
  );
}

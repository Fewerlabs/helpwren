"use client";

import { useRef, useState } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";
import { type IconName } from "../icon/registry";
import { OptionList, type OptionListOption } from "../option-list/option-list";
import { Popover, PopoverContent, PopoverTrigger } from "../popover/popover";
import { focusRing } from "../styles";

export interface FilterDefinition {
  /** Identifies the filter in the value, such as `status`. */
  id: string;
  /** What the filter is called, such as "Status". */
  label: string;
  icon?: IconName;
  options: readonly OptionListOption[];
}

/** The chosen values of each filter in use, by filter id. No values means "any". */
export type FilterValue = Readonly<Record<string, readonly string[]>>;

export interface FilterBarProps {
  filters: readonly FilterDefinition[];
  value: FilterValue;
  onValueChange: (value: FilterValue) => void;
  /** The text of the button that adds a filter. */
  addLabel?: string;
  className?: string;
}

/** A short account of what a filter is set to: "Open", "Open, Waiting", or "Open +2". */
function summary(filter: FilterDefinition, chosen: readonly string[]): string {
  const labels = filter.options
    .filter((option) => chosen.includes(option.value))
    .map((option) => option.label);
  if (labels.length === 0) return "Any";
  return labels.length <= 2 ? labels.join(", ") : `${labels[0] ?? ""} +${labels.length - 1}`;
}

const chip =
  "border-rule hover:bg-muted data-[state=open]:bg-muted inline-flex h-7 items-center gap-1.5 border text-xs transition-colors";

/**
 * Filters a list by several properties at once. Each filter in use is a chip that names the
 * property and what it is set to; pressing it opens the options, where any number can be
 * chosen. "Filter" adds another. It only describes what is chosen: apply `value` to your query.
 */
export function FilterBar({
  filters,
  value,
  onValueChange,
  addLabel = "Filter",
  className,
}: FilterBarProps) {
  // Which chip's options are open. A filter opens as soon as it is added, ready to be set.
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // The filter just added, whose options open once the menu that added it has closed.
  const justAdded = useRef<string | null>(null);

  const inUse = filters.filter((filter) => filter.id in value);
  const unused = filters.filter((filter) => !(filter.id in value));

  function toggle(filter: FilterDefinition, option: string) {
    const chosen = value[filter.id] ?? [];
    onValueChange({
      ...value,
      [filter.id]: chosen.includes(option)
        ? chosen.filter((item) => item !== option)
        : [...chosen, option],
    });
  }

  function remove(id: string) {
    onValueChange(Object.fromEntries(Object.entries(value).filter(([key]) => key !== id)));
  }

  return (
    <div
      role="group"
      aria-label="Filters"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {inUse.map((filter) => {
        const chosen = value[filter.id] ?? [];
        return (
          <span key={filter.id} className="inline-flex">
            <Popover
              open={openId === filter.id}
              onOpenChange={(open) => {
                setOpenId(open ? filter.id : null);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  // The two parts are separate elements, so the name is spelled out whole.
                  aria-label={`${filter.label}: ${summary(filter, chosen)}`}
                  className={cn(chip, "rounded-l-md border-r-0 pr-2 pl-2", focusRing)}
                >
                  {filter.icon ? (
                    <Icon name={filter.icon} className="text-muted-foreground size-3.5" />
                  ) : null}
                  <span className="text-muted-foreground">{filter.label}: </span>
                  <span className="font-medium">{summary(filter, chosen)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                className="w-auto overflow-hidden rounded-lg p-0"
              >
                <OptionList
                  multiple
                  label={filter.label}
                  options={filter.options}
                  selected={chosen}
                  onPick={(option) => {
                    toggle(filter, option);
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label={`Remove the ${filter.label} filter`}
              className={cn(chip, "text-muted-foreground rounded-r-md px-1.5", focusRing)}
              onClick={() => {
                remove(filter.id);
              }}
            >
              <Icon name="x" className="size-3" />
            </button>
          </span>
        );
      })}

      {unused.length > 0 ? (
        <Popover open={adding} onOpenChange={setAdding}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-haspopup="listbox"
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors",
                focusRing,
              )}
            >
              <Icon name={inUse.length > 0 ? "plus" : "funnel"} className="size-3.5" />
              {addLabel}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-auto overflow-hidden rounded-lg p-0"
            onCloseAutoFocus={(event) => {
              if (justAdded.current === null) return;
              // Focus would go back to the Filter button, which closes whatever opens next.
              event.preventDefault();
              setOpenId(justAdded.current);
              justAdded.current = null;
            }}
          >
            <OptionList
              label="Filter by"
              searchPlaceholder="Filter by"
              options={unused.map((filter) => ({
                value: filter.id,
                label: filter.label,
                ...(filter.icon
                  ? {
                      content: (
                        <>
                          <Icon name={filter.icon} className="text-muted-foreground size-3.5" />
                          {filter.label}
                        </>
                      ),
                    }
                  : {}),
              }))}
              selected={[]}
              onPick={(id) => {
                justAdded.current = id;
                setAdding(false);
                onValueChange({ ...value, [id]: [] });
              }}
            />
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";
import { OptionList, type OptionListOption } from "../option-list/option-list";
import { Popover, PopoverContent, PopoverTrigger } from "../popover/popover";
import { focusRing } from "../styles";

export interface InlineSelectProps {
  /** Names the control for assistive technology, such as "Assignee of ticket #1042". */
  label: string;
  value: string;
  options: readonly OptionListOption[];
  onValueChange: (value: string) => void;
  /** What shows in place: the chosen option as it would look if it could not be changed. */
  children: ReactNode;
  /** Shows a search box in the list. Default: when there are more than seven options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Chooses one option, without looking like a form field. What shows is the value itself (a
 * chip, an avatar and a name), and pressing it opens a list to choose from. For values edited
 * in place, such as a cell in a table. In a form, use `Select`.
 */
export function InlineSelect({
  label,
  value,
  options,
  onValueChange,
  children,
  searchable,
  searchPlaceholder,
  disabled = false,
  className,
}: InlineSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "group/inline-select hover:bg-muted data-[state=open]:bg-muted -mx-1.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-1 text-left transition-colors disabled:pointer-events-none",
            focusRing,
            className,
          )}
        >
          {/* Read out before the value, so the name says both what this is and what it is set to. */}
          <span className="sr-only">{label}: </span>
          <span className="flex min-w-0 items-center gap-2">{children}</span>
          <Icon
            name="caret-down"
            className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover/inline-select:opacity-100 group-focus-visible/inline-select:opacity-100 group-data-[state=open]/inline-select:opacity-100"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-auto overflow-hidden rounded-lg p-0"
      >
        <OptionList
          label={label}
          options={options}
          selected={[value]}
          {...(searchable === undefined ? {} : { searchable })}
          {...(searchPlaceholder === undefined ? {} : { searchPlaceholder })}
          onPick={(picked) => {
            setOpen(false);
            if (picked !== value) onValueChange(picked);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

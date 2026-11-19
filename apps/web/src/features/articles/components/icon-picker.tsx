"use client";

import { cn, Icon } from "@helpwren/design-system";

import { collectionIcons } from "../collection-icons";

export interface IconPickerProps {
  /** Names the group for assistive technology, such as "Icon". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** A grid of icons to choose one from, for a collection. */
export function IconPicker({ label, value, onChange, disabled = false }: IconPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {collectionIcons.map((icon) => (
        <label
          key={icon.name}
          title={icon.label}
          className={cn(
            "border-rule has-focus-visible:outline-ring grid size-9 cursor-pointer place-items-center rounded-lg border transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
            value === icon.name
              ? "border-foreground bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="radio"
            name="collection-icon"
            className="sr-only"
            aria-label={icon.label}
            value={icon.name}
            checked={value === icon.name}
            disabled={disabled}
            onChange={() => {
              onChange(icon.name);
            }}
          />
          <Icon name={icon.name} className="size-4.5" />
        </label>
      ))}
    </div>
  );
}

"use client";

import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@helpwren/design-system";

export interface PickerProps {
  /** The accessible name, such as "Assignee" or "Priority of ticket #1042". */
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

/** A small select for changing one property in place, where a full-size control would crowd. */
export function Picker({ label, value, options, onChange, className }: PickerProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn("h-7 px-2 text-xs data-[size=default]:h-7", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The value a picker uses for "assigned to nobody", which a select cannot express as null. */
export const NOBODY = "nobody";

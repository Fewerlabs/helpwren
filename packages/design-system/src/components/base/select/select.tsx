import type { ComponentProps } from "react";

import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectGroup as UiSelectGroup,
  SelectItem as UiSelectItem,
  SelectLabel as UiSelectLabel,
  SelectSeparator as UiSelectSeparator,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from "#components/ui/select";
import { cn } from "#lib/cn";

import { caretFlip, controlInvalid, controlSurface, focusRing } from "../styles";

export type SelectProps = ComponentProps<typeof UiSelect>;
export type SelectTriggerProps = Omit<ComponentProps<typeof UiSelectTrigger>, "size">;
export type SelectContentProps = ComponentProps<typeof UiSelectContent>;
export type SelectItemProps = ComponentProps<typeof UiSelectItem>;

/** Chooses one option from a list. Use `RadioGroup` instead when there are four or fewer. */
export const Select = UiSelect;
export const SelectGroup = UiSelectGroup;
export const SelectValue = UiSelectValue;

/** The button that shows the current value and opens the list. */
export function SelectTrigger({ className, ...props }: SelectTriggerProps) {
  return (
    <UiSelectTrigger
      className={cn(
        "dark:hover:bg-card w-full px-3 data-[size=default]:h-(--hw-control-height,2.5rem) md:text-(length:--hw-control-text,0.875rem)",
        controlSurface,
        // A button only reports focus-visible for the keyboard, so the ring needs no help here.
        "focus:border-ring data-[state=open]:border-ring aria-invalid:focus:border-destructive",
        caretFlip,
        focusRing,
        controlInvalid,
        className,
      )}
      {...props}
    />
  );
}

/** The list opens below the field, or above it when there is no room, and matches its width. */
export function SelectContent({
  className,
  position = "popper",
  align = "start",
  sideOffset = 6,
  ...props
}: SelectContentProps) {
  return (
    <UiSelectContent
      position={position}
      align={align}
      sideOffset={sideOffset}
      // No padding: options run edge to edge, and the list's own corners clip the first and last.
      className={cn("border-line border-border rounded-lg p-0 ring-0", className)}
      {...props}
    />
  );
}

export function SelectItem({ className, ...props }: SelectItemProps) {
  return <UiSelectItem className={cn("min-h-9 rounded-none py-2 pl-3", className)} {...props} />;
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof UiSelectLabel>) {
  return <UiSelectLabel className={cn("text-2xs font-mono uppercase", className)} {...props} />;
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof UiSelectSeparator>) {
  return <UiSelectSeparator className={cn("bg-rule", className)} {...props} />;
}

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

import { controlInvalid, controlSurface, focusRing } from "../styles";

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
        "dark:hover:bg-card w-full px-3 data-[size=default]:h-11",
        controlSurface,
        focusRing,
        controlInvalid,
        className,
      )}
      {...props}
    />
  );
}

export function SelectContent({ className, ...props }: SelectContentProps) {
  return (
    <UiSelectContent
      className={cn("border-line border-border rounded-lg ring-0", className)}
      {...props}
    />
  );
}

export function SelectItem({ className, ...props }: SelectItemProps) {
  return <UiSelectItem className={cn("min-h-9 py-2 pl-2", className)} {...props} />;
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof UiSelectLabel>) {
  return <UiSelectLabel className={cn("text-2xs font-mono uppercase", className)} {...props} />;
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof UiSelectSeparator>) {
  return <UiSelectSeparator className={cn("bg-rule", className)} {...props} />;
}

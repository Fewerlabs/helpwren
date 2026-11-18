import type { ComponentProps } from "react";

import {
  Popover as UiPopover,
  PopoverAnchor as UiPopoverAnchor,
  PopoverContent as UiPopoverContent,
  PopoverTrigger as UiPopoverTrigger,
} from "#components/ui/popover";
import { cn } from "#lib/cn";

export type PopoverProps = ComponentProps<typeof UiPopover>;
export type PopoverContentProps = ComponentProps<typeof UiPopoverContent>;

/** A small panel anchored to a trigger, for content that needs interaction. */
export const Popover = UiPopover;
export const PopoverTrigger = UiPopoverTrigger;
export const PopoverAnchor = UiPopoverAnchor;

export function PopoverContent({ className, ...props }: PopoverContentProps) {
  return (
    <UiPopoverContent
      // A quiet edge: a popover is a surface over the page, not a control to find.
      className={cn("border-rule rounded-xl border p-4 ring-0", className)}
      {...props}
    />
  );
}

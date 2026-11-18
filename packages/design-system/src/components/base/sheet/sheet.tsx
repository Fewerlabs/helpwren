import type { ComponentProps } from "react";

import {
  Sheet as UiSheet,
  SheetClose as UiSheetClose,
  SheetContent as UiSheetContent,
  SheetDescription as UiSheetDescription,
  SheetFooter as UiSheetFooter,
  SheetHeader as UiSheetHeader,
  SheetTitle as UiSheetTitle,
  SheetTrigger as UiSheetTrigger,
} from "#components/ui/sheet";
import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";

export type SheetProps = ComponentProps<typeof UiSheet>;

export interface SheetContentProps extends Omit<
  ComponentProps<typeof UiSheetContent>,
  "showCloseButton"
> {
  /** The accessible name of the close button. */
  closeLabel?: string;
}

/** A panel that slides in from an edge, for detail or secondary tasks beside the page. */
export const Sheet = UiSheet;
export const SheetTrigger = UiSheetTrigger;
export const SheetClose = UiSheetClose;
export const SheetHeader = UiSheetHeader;
export const SheetFooter = UiSheetFooter;
export const SheetDescription = UiSheetDescription;

export function SheetContent({
  closeLabel = "Close",
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <UiSheetContent showCloseButton={false} className={cn("border-rule", className)} {...props}>
      {children}
      <UiSheetClose asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={closeLabel}
          className="absolute top-3 right-3"
        >
          <Icon name="x" />
        </Button>
      </UiSheetClose>
    </UiSheetContent>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof UiSheetTitle>) {
  return <UiSheetTitle className={cn("pr-8 text-lg font-semibold", className)} {...props} />;
}

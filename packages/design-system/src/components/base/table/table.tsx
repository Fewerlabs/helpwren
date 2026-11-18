"use client";

import type { ComponentProps } from "react";

import {
  TableBody as UiTableBody,
  TableCaption as UiTableCaption,
  TableCell as UiTableCell,
  TableFooter as UiTableFooter,
  TableHead as UiTableHead,
  TableHeader as UiTableHeader,
  TableRow as UiTableRow,
} from "#components/ui/table";
import { cn } from "#lib/cn";
import { useScrollableFocus } from "#lib/scrollable-focus";

import { focusRing } from "../styles";

export interface TableProps extends ComponentProps<"table"> {
  /** Classes for the scrolling box around the table, for example `max-h-96 overflow-y-auto`. */
  containerClassName?: string | undefined;
}

/**
 * The table parts, for when you lay a table out by hand. For a table driven by a
 * list of columns, with sorting and selection, use `DataTable`.
 *
 * Unlike the other parts this one is not the shadcn component, whose scrolling
 * container cannot be styled; the container is needed for sticky headers.
 */
export function Table({ className, containerClassName, ...props }: TableProps) {
  // A table wider or taller than its box scrolls; a keyboard must be able to scroll it too.
  const scrollable = useScrollableFocus<HTMLDivElement>();
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", focusRing, containerClassName)}
      {...scrollable}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-separate border-spacing-0 text-sm", className)}
        {...props}
      />
    </div>
  );
}

export const TableHeader = UiTableHeader;
export const TableBody = UiTableBody;

export function TableFooter({ className, ...props }: ComponentProps<typeof UiTableFooter>) {
  return (
    <UiTableFooter
      className={cn("[&_td]:border-rule border-t-0 [&_td]:border-t", className)}
      {...props}
    />
  );
}

/** Rows are divided by the rule colour. Borders sit on the cells so a sticky header keeps its line. */
export function TableRow({ className, ...props }: ComponentProps<typeof UiTableRow>) {
  return (
    <UiTableRow
      className={cn(
        "hover:bg-muted/60 data-[state=selected]:bg-muted border-b-0 [&:not(:last-child)>td]:border-b",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<typeof UiTableHead>) {
  return (
    <UiTableHead
      className={cn(
        "text-muted-foreground border-rule h-10 border-b px-3 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<typeof UiTableCell>) {
  return <UiTableCell className={cn("border-rule px-3 py-2.5", className)} {...props} />;
}

export const TableCaption = UiTableCaption;

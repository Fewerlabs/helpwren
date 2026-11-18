import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import type { StatusName } from "../../../tokens/tokens";

const statusChipVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      status: {
        open: "bg-status-open-surface text-status-open",
        waiting: "bg-status-waiting-surface text-status-waiting",
        resolved: "bg-status-resolved-surface text-status-resolved",
        urgent: "bg-status-urgent-surface text-status-urgent",
        closed: "bg-status-closed-surface text-status-closed",
      } satisfies Record<StatusName, string>,
      size: {
        sm: "h-5 px-2 text-xs",
        md: "h-6 px-2.5 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const defaultLabels: Record<StatusName, string> = {
  open: "Open",
  waiting: "Waiting",
  resolved: "Resolved",
  urgent: "Urgent",
  closed: "Closed",
};

export interface StatusChipProps extends ComponentProps<"span"> {
  status: StatusName;
  size?: "sm" | "md";
}

/**
 * Shows a status as a coloured chip with a dot and a word, so it never depends on
 * colour alone. Pass children to change the wording, for example "Waiting on you".
 */
export function StatusChip({
  status,
  size = "md",
  className,
  children,
  ...props
}: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      data-status={status}
      className={cn(statusChipVariants({ status, size }), className)}
      {...props}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children ?? defaultLabels[status]}
    </span>
  );
}

import type { ReactNode } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";
import { focusRing } from "../styles";

export interface ChipProps {
  children: ReactNode;
  /** The accessible name of the remove button, such as "Remove billing". */
  removeLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

/** One value inside a multi-value control, with a button to remove it. */
export function Chip({ children, removeLabel, onRemove, disabled = false, className }: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(
        "bg-muted text-foreground inline-flex h-7 max-w-full items-center gap-1 rounded-md pr-1 pl-2 text-sm",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <button
        type="button"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onRemove}
        className={cn(
          "text-muted-foreground hover:text-foreground relative flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors disabled:pointer-events-none",
          // Extends the hit area without growing the chip.
          "after:absolute after:-inset-2",
          focusRing,
        )}
      >
        <Icon name="x" weight="bold" className="size-3" />
      </button>
    </span>
  );
}

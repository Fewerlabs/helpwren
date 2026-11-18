import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

/**
 * Help text for a control. `Field` renders one for its `hint`; use it directly
 * when you lay out a control yourself, and point `aria-describedby` at its id.
 */
export function FieldHint({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="field-hint"
      className={cn("text-muted-foreground text-xs leading-normal", className)}
      {...props}
    />
  );
}

/**
 * An error message for a control, announced when it appears. `Field` renders one
 * for its `error`. It renders nothing when it has no content.
 */
export function FieldError({ className, children, ...props }: ComponentProps<"p">) {
  if (children === undefined || children === null || children === false || children === "") {
    return null;
  }
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn("text-destructive text-xs leading-normal font-medium", className)}
      {...props}
    >
      {children}
    </p>
  );
}

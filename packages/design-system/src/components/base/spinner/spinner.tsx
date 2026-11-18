import type { ComponentProps } from "react";

import { Spinner as UiSpinner } from "#components/ui/spinner";
import { cn } from "#lib/cn";

export interface SpinnerProps extends Omit<ComponentProps<"svg">, "children"> {
  /** Announced to assistive technology while the spinner is shown. */
  label?: string;
}

/** A small loading indicator. It follows the text colour and is `1rem` unless sized by a class. */
export function Spinner({ label = "Loading", className, ...props }: SpinnerProps) {
  return <UiSpinner aria-label={label} className={cn("text-current", className)} {...props} />;
}

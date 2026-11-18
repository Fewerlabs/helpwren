import type { ComponentProps } from "react";

import { Label as UiLabel } from "#components/ui/label";
import { cn } from "#lib/cn";

export type LabelProps = ComponentProps<typeof UiLabel>;

/** The visible name of a control. Connect it with `htmlFor`, or wrap the control. */
export function Label({ className, ...props }: LabelProps) {
  return <UiLabel className={cn("text-foreground leading-snug", className)} {...props} />;
}

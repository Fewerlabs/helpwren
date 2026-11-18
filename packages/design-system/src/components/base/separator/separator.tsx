import type { ComponentProps } from "react";

import { Separator as UiSeparator } from "#components/ui/separator";
import { cn } from "#lib/cn";

export type SeparatorProps = ComponentProps<typeof UiSeparator>;

/** A thin divider in the rule colour. Decorative unless `decorative={false}` is passed. */
export function Separator({ className, ...props }: SeparatorProps) {
  return <UiSeparator className={cn("bg-rule", className)} {...props} />;
}

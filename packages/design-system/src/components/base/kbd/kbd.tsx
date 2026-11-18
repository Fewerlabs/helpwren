import type { ComponentProps } from "react";

import { Kbd as UiKbd } from "#components/ui/kbd";
import { cn } from "#lib/cn";

export type KbdProps = ComponentProps<"kbd">;

/** A keyboard key or shortcut, such as ⌘K. */
export function Kbd({ className, ...props }: KbdProps) {
  return <UiKbd className={cn("h-6 min-w-6 rounded-md px-1.5 font-mono", className)} {...props} />;
}

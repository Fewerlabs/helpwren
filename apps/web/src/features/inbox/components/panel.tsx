import { cn } from "@helpwren/design-system";
import { type ComponentProps } from "react";

/** One of the inbox's three cards. Each scrolls on its own inside the fixed-height page. */
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "border-line border-border bg-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl",
        className,
      )}
      {...props}
    />
  );
}

/** The bar across the top of a panel. */
export function PanelHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      className={cn("border-rule flex h-14 shrink-0 items-center gap-2 border-b px-4", className)}
      {...props}
    />
  );
}

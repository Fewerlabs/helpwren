import { cn } from "@helpwren/design-system";
import { type ComponentProps } from "react";

/**
 * One column of a dashboard page's surface. Columns sit side by side, divided by a hairline,
 * and each scrolls on its own inside the fixed-height page.
 */
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("flex min-h-0 min-w-0 flex-col", className)} {...props} />;
}

/** The bar across the top of a column. */
export function PanelHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      className={cn("border-rule flex h-11 shrink-0 items-center gap-2 border-b px-3", className)}
      {...props}
    />
  );
}

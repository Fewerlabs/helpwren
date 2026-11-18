import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

export interface MarginNoteProps extends ComponentProps<"p"> {
  /**
   * Which way the arrow points, or `none`. `down-right` follows the note and points
   * below it; `up-left` comes before the note and points above it. A note points at
   * one thing, with one arrow.
   */
  arrow?: "down-right" | "up-left" | "none";
}

// Both arrows are taken from the brand boards.
const arrows = {
  "down-right": { viewBox: "0 0 70 70", paths: ["M6 8C30 6 48 22 52 56", "M43 48 52 57 59 46"] },
  "up-left": { viewBox: "0 0 90 50", paths: ["M84 40C60 44 30 36 12 12", "M10 24 11 11 24 13"] },
} as const;

/**
 * A handwritten note in red pen, as if added in the margin. For the marketing
 * site, the docs and beside illustrations only; never inside the product
 * interface, which stays calm.
 */
export function MarginNote({
  arrow = "down-right",
  className,
  children,
  ...props
}: MarginNoteProps) {
  const shape = arrow === "none" ? undefined : arrows[arrow];
  const drawing = shape ? (
    <svg
      viewBox={shape.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-10 w-auto shrink-0", arrow === "down-right" && "mt-3")}
    >
      {shape.paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  ) : null;

  return (
    <p
      data-slot="margin-note"
      className={cn(
        "font-hand text-pen inline-flex items-start gap-1.5 text-2xl leading-tight font-medium",
        arrow === "up-left" && "items-end",
        className,
      )}
      {...props}
    >
      {arrow === "up-left" ? drawing : null}
      <span>{children}</span>
      {arrow === "down-right" ? drawing : null}
    </p>
  );
}

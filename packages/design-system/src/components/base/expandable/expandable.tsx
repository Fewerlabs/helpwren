import type { ComponentProps, CSSProperties } from "react";

import { cn } from "#lib/cn";

export interface ExpandableProps extends ComponentProps<"div"> {
  /** Whether the content is shown. */
  open: boolean;
  /** `vertical` animates the height, `horizontal` the width. Default `vertical`. */
  orientation?: "vertical" | "horizontal";
  /** The length of the animation in milliseconds. Default 200. */
  duration?: number;
  /** A CSS easing function. Default `ease-out`. */
  easing?: CSSProperties["transitionTimingFunction"];
  /** Fades the content while it moves. Default true. */
  fade?: boolean;
  /** Classes for the inner element that holds the content and clips it. */
  contentClassName?: string;
}

/**
 * Expands and collapses its content smoothly with CSS grid alone: the track goes
 * from `0fr` to `1fr`, so the content's size never has to be measured. While
 * closed the content is `inert`, so it cannot be focused or read out.
 *
 * It only animates. Pair it with your own trigger and set `aria-expanded` and
 * `aria-controls` on that trigger.
 */
export function Expandable({
  open,
  orientation = "vertical",
  duration = 200,
  easing = "ease-out",
  fade = true,
  className,
  contentClassName,
  style,
  children,
  ...props
}: ExpandableProps) {
  const vertical = orientation === "vertical";

  return (
    <div
      data-slot="expandable"
      data-state={open ? "open" : "closed"}
      data-orientation={orientation}
      inert={!open}
      className={cn(
        "grid",
        vertical
          ? "transition-[grid-template-rows,opacity]"
          : "transition-[grid-template-columns,opacity]",
        vertical && (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"),
        !vertical && (open ? "grid-cols-[1fr]" : "grid-cols-[0fr]"),
        fade && !open && "opacity-0",
        className,
      )}
      style={{ transitionDuration: `${duration}ms`, transitionTimingFunction: easing, ...style }}
      {...props}
    >
      <div
        data-slot="expandable-content"
        className={cn("overflow-hidden", vertical ? "min-h-0" : "min-w-0", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}

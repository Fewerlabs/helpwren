"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "#lib/cn";

import { RoughFilter, useFilterId, useIllustrationMotion, type IllustrationMotion } from "./wren";

export interface SketchProps extends Omit<ComponentProps<"svg">, "children" | "ref"> {
  /** The drawing's coordinate box, as an SVG viewBox. */
  viewBox: string;
  /** The strokes. Give each path `pathLength={1}` so it can draw itself in. */
  children: ReactNode;
  /** How it moves, as for the wren's scenes. Default `"in-view"`. */
  animate?: IllustrationMotion;
  /** Describes the drawing for screen readers. Without it the drawing is decorative. */
  label?: string;
  /** Adds the hand-drawn wobble. Default true. */
  rough?: boolean;
  /** Draws it again, with its small action, each time this number goes up. */
  replay?: number;
}

/**
 * A line drawing of a page's own, in the same hand as the wren's scenes: ink in the text colour,
 * 1.6 strokes, a slight wobble, drawn in when it scrolls into view and quietly alive afterwards.
 * The classes the scenes use for life work here too: `hw-leaf` and `hw-grass` sway, `hw-pen`
 * comes last, `hw-hl` fades in behind, `hw-settle` settles like paper once drawn.
 */
export function Sketch({
  viewBox,
  children,
  animate = "in-view",
  label,
  rough = true,
  replay = 0,
  className,
  ...props
}: SketchProps) {
  const filterId = useFilterId();
  const { setElement, attributes, contentKey } = useIllustrationMotion(animate, replay);
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg
      ref={setElement}
      viewBox={viewBox}
      data-slot="sketch"
      {...attributes}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-foreground h-auto w-full", className)}
      {...accessibility}
      {...props}
    >
      {rough ? (
        <>
          <defs>
            <RoughFilter id={filterId} />
          </defs>
          <g key={contentKey} filter={`url(#${filterId})`}>
            {children}
          </g>
        </>
      ) : (
        <g key={contentKey}>{children}</g>
      )}
    </svg>
  );
}

import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { wrenFrame, type WrenFrameKind, type WrenView } from "./wren-frames";

export interface WrenFlyerProps extends Omit<ComponentProps<"svg">, "children"> {
  /** The view angle. Default `side`. */
  view?: WrenView;
  /** Which frame: a beat frame, the glide, a flare frame or a perched idle. */
  frame: WrenFrameKind;
  /** Faces left instead of right. */
  mirrored?: boolean;
  /** Describes it for screen readers. Without it the wren is decorative. */
  label?: string;
}

/**
 * One frame of the wren's drawn flight, in the logo's box and line (feet at 51% across, 88%
 * down). A page plays it by changing `frame` about twelve times a second, like drawn animation.
 */
export function WrenFlyer({
  view = "side",
  frame,
  mirrored = false,
  label,
  className,
  style,
  ...props
}: WrenFlyerProps) {
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);
  return (
    <svg
      viewBox="9 8 56 56"
      data-slot="wren-flyer"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-foreground h-auto w-full", className)}
      style={mirrored ? { ...style, transform: "scaleX(-1)" } : style}
      {...accessibility}
      // The frames are drawn by this package from its own data; nothing here comes from a user.
      dangerouslySetInnerHTML={{ __html: wrenFrame(view, frame) }}
      {...props}
    />
  );
}

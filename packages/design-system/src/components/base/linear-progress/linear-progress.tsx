import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

export interface LinearProgressProps extends Omit<ComponentProps<"div">, "children"> {
  /** Progress from 0 to 100. Leave it out when the amount of work is unknown. */
  value?: number;
  /** Announced to assistive technology. */
  label?: string;
}

/**
 * A thin bar along the top edge of content. Use it when content is already on
 * screen and is being refreshed or added to, so nothing jumps; use `Spinner` or
 * `Skeleton` when there is nothing to show yet.
 */
export function LinearProgress({
  value,
  label = "Loading",
  className,
  ...props
}: LinearProgressProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(100, Math.max(0, value)) : undefined;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={clamped}
      data-slot="linear-progress"
      data-state={determinate ? "determinate" : "indeterminate"}
      className={cn("bg-rule relative h-0.5 w-full overflow-hidden", className)}
      {...props}
    >
      {determinate ? (
        <div
          className="bg-primary h-full transition-[width] duration-200"
          style={{ width: `${clamped ?? 0}%` }}
        />
      ) : (
        // With reduced motion the segment does not travel, so it fills the track instead.
        <div className="bg-primary animate-progress absolute inset-y-0 left-0 w-1/4 motion-reduce:w-full motion-reduce:opacity-60" />
      )}
    </div>
  );
}

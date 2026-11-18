import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

export interface LogoProps extends Omit<ComponentProps<"span">, "children"> {
  /** `mark` is the wren alone; `lockup` adds the Helpwren wordmark. */
  variant?: "mark" | "lockup";
  /** The height of the mark in pixels. Detail drops and the line thickens as it shrinks. */
  size?: number;
  /** The accessible name. Pass an empty string when the logo sits beside the name in text. */
  label?: string;
}

/** Stroke width in viewBox units for a given rendered size, from the brand board. */
const weights = [
  [16, 5],
  [24, 3.4],
  [32, 2.6],
  [56, 1.7],
  [132, 1.15],
] as const;

function strokeWidth(size: number): number {
  const [smallest] = weights;
  const largest = weights[weights.length - 1] ?? smallest;
  if (size <= smallest[0]) {
    return smallest[1];
  }
  if (size >= largest[0]) {
    return largest[1];
  }
  const upper = weights.findIndex(([at]) => at >= size);
  const [fromSize, fromWeight] = weights[upper - 1] ?? smallest;
  const [toSize, toWeight] = weights[upper] ?? largest;
  return fromWeight + ((toWeight - fromWeight) * (size - fromSize)) / (toSize - fromSize);
}

/**
 * The Helpwren mark: a wren drawn in one line. As it shrinks it loses detail in the
 * order the brand board sets: brow first, then wing, then eye.
 */
export function Logo({
  variant = "mark",
  size = 32,
  label = "Helpwren",
  className,
  ...props
}: LogoProps) {
  const showBrow = size >= 48;
  const showWing = size >= 28;
  const showEye = size >= 20;
  const details = [
    showBrow ? "M42 24.4C45 22.8 48.3 23 50.8 24.6" : "",
    showWing ? "M28 34.5C30.5 41 38 44 45 39.5" : "",
    "M35.5 50 35 57M41.5 49.5 42.5 57",
  ].join("");
  const named = label !== "";

  return (
    <span
      data-slot="logo"
      data-variant={variant}
      role={named ? "img" : undefined}
      aria-label={named ? label : undefined}
      aria-hidden={named ? undefined : true}
      className={cn("text-foreground inline-flex items-center", className)}
      style={{ gap: size * 0.2 }}
      {...props}
    >
      <svg
        viewBox="9 8 56 56"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth(size)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z" />
        <path d={details} />
        {showEye ? (
          <circle
            cx="47.5"
            cy="28.2"
            r={size >= 48 ? 1.2 : 1.7}
            fill="currentColor"
            stroke="none"
          />
        ) : null}
      </svg>
      {variant === "lockup" ? (
        <span
          aria-hidden="true"
          className="leading-none font-semibold tracking-[-0.035em]"
          style={{ fontSize: size * 0.7 }}
        >
          Helpwren
        </span>
      ) : null}
    </span>
  );
}

"use client";

import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { useIllustrationMotion, type IllustrationMotion } from "./wren";

/** The wren's poses, in the logo's single line. */
export const wrenPoses = [
  "perched",
  "wings-up",
  "wings-down",
  "gliding",
  "landing",
  "asleep",
] as const;

export type WrenPose = (typeof wrenPoses)[number];

const BODY =
  "M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z";
const BROW = "M42 24.4C45 22.8 48.3 23 50.8 24.6";
const FOLDED_WING = "M28 34.5C30.5 41 38 44 45 39.5";
const FEET_DOWN = "M35.5 50 35 57M41.5 49.5 42.5 57";
const FEET_TUCKED = "M34.5 50 31 54.5M40.5 49.8 38 55";
const FEET_FORWARD = "M36.5 50 40 56.5M42 49.5 47 55";

/** Each pose's strokes besides the body. The first wing path is the one that moves. */
const poses: Record<WrenPose, { wing: readonly string[]; rest: readonly string[] }> = {
  perched: { wing: [FOLDED_WING], rest: [BROW, FEET_DOWN] },
  "wings-up": {
    wing: [
      "M31 30.5C27.5 24.5 28 16.5 32 11.5 38 15.5 42.5 22.5 44 29.5",
      "M34 17.5C36 21.5 38.5 25 41 28",
    ],
    rest: [BROW, FEET_TUCKED],
  },
  "wings-down": {
    wing: [
      "M31 37C28.5 44 30 51.5 34.5 56 39 50.5 42.5 44 43.5 38",
      "M34 50C36 46.5 38 43 40 39.5",
    ],
    rest: [BROW, FEET_TUCKED],
  },
  gliding: {
    wing: ["M33 33C26 29 17 28.5 10.5 31.5 17.5 36.5 26 38 34 37", "M16 32.5C21 33 26 34 30.5 35"],
    rest: [BROW, FEET_TUCKED],
  },
  landing: {
    wing: [
      "M30 31C25 26 24 18.5 26.5 12.5 33.5 15.5 39 22 41.5 29.5",
      "M29 18C31.5 22 34.5 25.5 37.5 28.5",
    ],
    rest: [BROW, FEET_FORWARD],
  },
  asleep: { wing: [FOLDED_WING], rest: [FEET_DOWN] },
};

export interface WrenBirdProps extends Omit<ComponentProps<"svg">, "children" | "ref"> {
  /** Which pose. Default `perched`. */
  pose?: WrenPose;
  /**
   * How it moves, as for the scenes. A perched wren blinks and now and then tilts its head or
   * hops; an asleep one breathes. Flight poses hold still: whatever flies them moves them.
   */
  animate?: IllustrationMotion;
  /** Makes it hop once, for a reaction (such as a chat opening). Change the value to hop again. */
  react?: string | number | undefined;
  /** Describes it for screen readers. Without it the wren is decorative. */
  label?: string;
}

/**
 * The wren alone, without a scene, in one of its poses. Drawn in the same box as the logo, so
 * its feet are at 51% across and 88% down, whatever the pose.
 */
export function WrenBird({
  pose = "perched",
  animate = false,
  react,
  label,
  className,
  ...props
}: WrenBirdProps) {
  const { setElement, attributes } = useIllustrationMotion(animate);
  const { wing, rest } = poses[pose];
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg
      ref={setElement}
      viewBox="9 8 56 56"
      data-slot="sketch"
      data-pose={pose}
      {...attributes}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-foreground h-auto w-full", className)}
      {...accessibility}
      {...props}
    >
      <g
        key={react}
        className={cn(
          pose === "perched" && "hw-bob",
          pose === "asleep" && "hw-breathe",
          react !== undefined && "hw-react",
        )}
      >
        <path pathLength={1} d={BODY} />
        {wing.map((d, index) => (
          <path key={d} pathLength={1} d={d} className={index === 0 ? "hw-wing" : undefined} />
        ))}
        {rest.map((d) => (
          <path key={d} pathLength={1} d={d} />
        ))}
        {pose === "asleep" ? (
          <>
            <path pathLength={1} d="M45.6 28.6C46.6 29.6 48.4 29.6 49.4 28.6" />
            <path
              className="hw-z hw-nodraw"
              d="M54 14H58L54 18H58M59.5 9H62L59.5 11.5H62"
              stroke="var(--muted-foreground)"
              strokeWidth={1.1}
            />
          </>
        ) : (
          <circle cx="47.5" cy="28.2" r="1.5" fill="currentColor" stroke="none" />
        )}
      </g>
    </svg>
  );
}

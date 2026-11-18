import { useId, type ComponentProps } from "react";

import { cn } from "#lib/cn";

import { scenes, type WrenScene } from "./scenes";

export interface WrenProps extends Omit<ComponentProps<"svg">, "children"> {
  /** Which scene to show. */
  scene: WrenScene;
  /** Draws the scene in when it appears. People who prefer reduced motion see it still. Default true. */
  animate?: boolean;
  /** Replaces the scene's built-in description for screen readers. */
  label?: string;
  /** Hides the illustration from screen readers, when the text beside it says it all. */
  decorative?: boolean;
  /**
   * Leaves the wren out, so only the things around it show. For a place that carries someone
   * else's brand, where our mark would sit beside their logo.
   */
  bird?: boolean;
}

/**
 * The wren, in one of its scenes. It turns up wherever the product would
 * otherwise be empty. Lines take the text colour, so it follows the theme.
 */
export function Wren({
  scene,
  animate = true,
  label,
  decorative = false,
  bird = true,
  className,
  ...props
}: WrenProps) {
  // Each illustration needs its own filter, and ids must be safe inside url(#...).
  const filterId = `hw-rough-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const accessibility = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label ?? scenes[scene].label } as const);

  return (
    <svg
      viewBox="0 0 220 170"
      data-slot="wren"
      data-scene={scene}
      data-animate={animate ? "" : undefined}
      data-bird={bird ? undefined : "off"}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-foreground h-auto w-full max-w-75", className)}
      {...accessibility}
      {...props}
    >
      <defs>
        {/* A slight wobble, as if drawn by hand. Only the drawings wobble, never the interface. */}
        <filter id={filterId} filterUnits="userSpaceOnUse" x="-20" y="-20" width="400" height="300">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>{scenes[scene].content}</g>
    </svg>
  );
}

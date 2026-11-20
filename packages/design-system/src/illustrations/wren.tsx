"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "#lib/cn";
import { useInViewStage } from "#lib/in-view";

import { scenes, type WrenScene } from "./scenes";

/**
 * How an illustration moves. `true` draws it in as soon as it appears; `"in-view"` waits until it
 * scrolls into view, for a long page; `false` shows it still. Either way, after drawing it lives
 * quietly (a blink, a hop, a leaf in the wind), paused while it is off screen with `"in-view"`.
 * People who prefer reduced motion always see it finished and still.
 */
export type IllustrationMotion = boolean | "in-view";

/**
 * The `data-animate` and `data-paused` attributes the illustration stylesheet reads, and the
 * callback to give the drawing's element as its `ref`.
 */
export function useIllustrationMotion(animate: IllustrationMotion) {
  const [element, setElement] = useState<Element | null>(null);
  const inView = useInViewStage(element, animate === "in-view");
  let state: string | undefined;
  if (animate === true) state = "";
  else if (animate === "in-view" && inView.stage !== "still") {
    state = inView.stage === "drawing" ? "" : inView.stage;
  }
  return {
    setElement,
    attributes: {
      "data-animate": state,
      "data-paused": animate === "in-view" && !inView.visible ? "" : undefined,
    },
  };
}

/** A slight wobble, as if drawn by hand. Only the drawings wobble, never the interface. */
export function RoughFilter({ id }: { id: string }) {
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x="-20" y="-20" width="400" height="300">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="n"
        scale="2"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  );
}

/** An id that is safe inside url(#...). */
export function useFilterId(): string {
  return `hw-rough-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export interface WrenProps extends Omit<ComponentProps<"svg">, "children" | "ref"> {
  /** Which scene to show. */
  scene: WrenScene;
  /** How it moves: see `IllustrationMotion`. Default true. */
  animate?: IllustrationMotion;
  /** Replaces the scene's built-in description for screen readers. */
  label?: string;
  /** Hides the illustration from screen readers, when the text beside it says it all. */
  decorative?: boolean;
  /**
   * Leaves the wren out, so only the things around it show. For a place that carries someone
   * else's brand, where our mark would sit beside their logo.
   */
  bird?: boolean;
  /** Drawn on top of the scene, such as marks of the page's own. */
  children?: ReactNode;
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
  children,
  ...props
}: WrenProps) {
  const filterId = useFilterId();
  const { setElement, attributes } = useIllustrationMotion(animate);
  const accessibility = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label ?? scenes[scene].label } as const);

  return (
    <svg
      ref={setElement}
      viewBox="0 0 220 170"
      data-slot="wren"
      data-scene={scene}
      {...attributes}
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
        <RoughFilter id={filterId} />
      </defs>
      <g filter={`url(#${filterId})`}>{scenes[scene].content}</g>
      {children}
    </svg>
  );
}

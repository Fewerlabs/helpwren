import { Sketch } from "@helpwren/design-system";

import { HERO_VIEWBOX, heroStrokes } from "./hero-strokes";

/**
 * The hero's drawing: a branch running back into the distance, with grass and a hill line. It is
 * the still version of the 3D scene, drawn from the same resting angle, so the canvas can fade in
 * over it without a jump.
 */
export function HeroSketch() {
  return (
    <Sketch
      viewBox={`0 0 ${String(HERO_VIEWBOX.width)} ${String(HERO_VIEWBOX.height)}`}
      animate
      data-sketch="hero"
    >
      {heroStrokes.map((stroke) => {
        const path = (
          <path
            key={stroke.d}
            pathLength={1}
            d={stroke.d}
            opacity={stroke.opacity}
            stroke={stroke.tone === "moss" ? "var(--moss)" : undefined}
          />
        );
        return stroke.life ? (
          <g key={stroke.d} className={stroke.life}>
            {path}
          </g>
        ) : (
          path
        );
      })}
    </Sketch>
  );
}

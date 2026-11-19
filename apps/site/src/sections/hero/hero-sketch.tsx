import { Sketch } from "@helpwren/design-system";

/**
 * The hero's drawing: a branch running back into the distance, with grass and a hill line. It is
 * the still version of the 3D scene, drawn from the same resting angle, so the canvas can fade in
 * over it without a jump.
 */
export function HeroSketch() {
  return (
    <Sketch viewBox="0 0 260 220" animate data-sketch="hero">
      <path
        pathLength={1}
        d="M4 196C46 186 96 190 140 182 180 175 222 178 256 168"
        opacity={0.35}
      />
      <path pathLength={1} d="M30 206C70 200 120 204 170 198" opacity={0.25} />
      <path pathLength={1} d="M6 140C60 130 112 142 162 134 198 128 228 130 256 118" />
      <path pathLength={1} d="M150 134C160 122 172 116 186 113" />
      <g className="hw-leaf" stroke="var(--moss)">
        <path pathLength={1} d="M186 113C192 103 202 102 207 107 203 115 194 117 186 113Z" />
      </g>
      <g className="hw-leaf hw-leaf2" stroke="var(--moss)">
        <path pathLength={1} d="M70 136C64 126 67 117 75 114 81 121 79 130 70 136Z" />
        <path pathLength={1} d="M226 128C232 136 240 138 248 136 244 128 236 125 226 128Z" />
      </g>
      <g className="hw-grass" stroke="var(--moss)">
        <path pathLength={1} d="M40 200C38 192 42 186 40 180M48 200C50 194 54 192 55 186" />
      </g>
    </Sketch>
  );
}

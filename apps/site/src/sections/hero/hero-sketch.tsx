/**
 * The hero's drawing: a branch running back into the distance, with grass and a hill line. It is
 * the still version of the 3D scene, drawn from the same resting angle, so the canvas can fade in
 * over it without a jump.
 */
export function HeroSketch() {
  return (
    <svg
      viewBox="0 0 260 220"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-sketch="hero"
      className="sketch h-auto w-full"
    >
      <path data-draw d="M4 196C46 186 96 190 140 182 180 175 222 178 256 168" opacity={0.35} />
      <path data-draw d="M30 206C70 200 120 204 170 198" opacity={0.25} />
      <path data-draw d="M6 140C60 130 112 142 162 134 198 128 228 130 256 118" />
      <path data-draw d="M150 134C160 122 172 116 186 113" />
      <g stroke="var(--moss)">
        <path data-draw d="M186 113C192 103 202 102 207 107 203 115 194 117 186 113Z" />
        <path data-draw d="M70 136C64 126 67 117 75 114 81 121 79 130 70 136Z" />
        <path data-draw d="M226 128C232 136 240 138 248 136 244 128 236 125 226 128Z" />
        <path data-draw d="M40 200C38 192 42 186 40 180M48 200C50 194 54 192 55 186" />
      </g>
      <path
        data-draw
        d="M168 58C184 50 200 49 212 54"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeDasharray="2 4"
      />
      <text
        x="254"
        y="46"
        textAnchor="end"
        stroke="none"
        fill="var(--muted-foreground)"
        className="font-hand text-[18px]"
        data-mark="label"
      >
        first sighting
      </text>
    </svg>
  );
}

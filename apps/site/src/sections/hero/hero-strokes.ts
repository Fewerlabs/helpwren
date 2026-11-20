/**
 * The hero's drawing as data, shared by the still SVG and the 3D scene so both draw the same
 * lines. Coordinates are in the drawing's 260 by 220 box. `depth` places a stroke nearer (+) or
 * further (-) in the 3D scene; the scene corrects for it so that at rest every line lands exactly
 * where the SVG draws it.
 */
export interface HeroStroke {
  d: string;
  tone: "ink" | "moss";
  opacity?: number;
  depth: number;
  /** The design system's life class: a leaf sways, grass bends. */
  life?: "hw-leaf" | "hw-leaf hw-leaf2" | "hw-grass";
}

export const HERO_VIEWBOX = { width: 260, height: 220 } as const;

export const heroStrokes: readonly HeroStroke[] = [
  {
    d: "M4 196C46 186 96 190 140 182 180 175 222 178 256 168",
    tone: "ink",
    opacity: 0.35,
    depth: -90,
  },
  { d: "M30 206C70 200 120 204 170 198", tone: "ink", opacity: 0.25, depth: -140 },
  { d: "M6 140C60 130 112 142 162 134 198 128 228 130 256 118", tone: "ink", depth: 0 },
  { d: "M150 134C160 122 172 116 186 113", tone: "ink", depth: 0 },
  {
    d: "M186 113C192 103 202 102 207 107 203 115 194 117 186 113Z",
    tone: "moss",
    depth: 0,
    life: "hw-leaf",
  },
  {
    d: "M70 136C64 126 67 117 75 114 81 121 79 130 70 136Z",
    tone: "moss",
    depth: 0,
    life: "hw-leaf hw-leaf2",
  },
  {
    d: "M226 128C232 136 240 138 248 136 244 128 236 125 226 128Z",
    tone: "moss",
    depth: 0,
    life: "hw-leaf hw-leaf2",
  },
  {
    d: "M40 200C38 192 42 186 40 180M48 200C50 194 54 192 55 186",
    tone: "moss",
    depth: 40,
    life: "hw-grass",
  },
];

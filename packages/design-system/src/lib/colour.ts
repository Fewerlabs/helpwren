import { contrastRatio } from "./contrast";

export { contrastRatio };

/**
 * Colour shades from one brand colour, worked out in OKLCH so a lighter or darker shade keeps the
 * brand's hue, and checked against the surfaces of each theme so whatever is drawn in it can be
 * read. Everything takes and gives `#rrggbb`.
 */

interface Oklch {
  l: number;
  c: number;
  h: number;
}

const HEX = /^#[0-9a-f]{6}$/i;

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function hexToRgb(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`Expected a #rrggbb colour, received "${hex}"`);
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** A colour as OKLCH: lightness 0–1, chroma, hue in degrees. */
export function toOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;
  return { l: lightness, c: Math.hypot(a, bb), h: hue < 0 ? hue + 360 : hue };
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const angle = (h * Math.PI) / 180;
  const a = c * Math.cos(angle);
  const b = c * Math.sin(angle);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
}

/**
 * An OKLCH colour as `#rrggbb`. One the screen cannot show loses chroma until it can, so the
 * lightness and hue asked for are kept.
 */
export function fromOklch(colour: Oklch): string {
  const l = Math.min(1, Math.max(0, colour.l));
  let c = colour.c;
  for (let step = 0; step < 40; step += 1) {
    const linear = oklchToLinear({ l, c, h: colour.h });
    if (linear.every((channel) => channel >= -0.0001 && channel <= 1.0001)) {
      return rgbToHex(linear.map(fromLinear));
    }
    c *= 0.9;
  }
  return rgbToHex(oklchToLinear({ l, c: 0, h: colour.h }).map(fromLinear));
}

/** The colour at another lightness (0–1), with its hue and as much of its chroma as fits. */
export function withLightness(hex: string, lightness: number, maxChroma = Infinity): string {
  const colour = toOklch(hex);
  return fromOklch({ l: lightness, c: Math.min(colour.c, maxChroma), h: colour.h });
}

/**
 * The shade of `hex` nearest to it that reaches `minimum` contrast against every background
 * given: darker on light backgrounds, lighter on dark ones. The colour itself when it already
 * does.
 */
export function readableShade(hex: string, backgrounds: readonly string[], minimum = 4.5): string {
  const passes = (candidate: string) =>
    backgrounds.every((background) => contrastRatio(candidate, background) >= minimum);
  if (passes(hex)) return hex;
  const colour = toOklch(hex);
  const darkBackground = backgrounds.every((background) => toOklch(background).l < 0.5);
  for (let step = 1; step <= 100; step += 1) {
    const l = darkBackground ? colour.l + step * 0.01 : colour.l - step * 0.01;
    if (l < 0 || l > 1) break;
    const candidate = fromOklch({ ...colour, l });
    if (passes(candidate)) return candidate;
  }
  return darkBackground ? "#ffffff" : "#000000";
}

const DARK_TEXT = "#101a15";
const LIGHT_TEXT = "#ffffff";

/** APCA lightness contrast (0 to about 106), which weighs a mid-tone the way the eye does. */
function apca(text: string, background: string): number {
  const y = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map((channel) => channel ** 2.4) as [number, number, number];
    const value = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    return value < 0.022 ? value + (0.022 - value) ** 1.414 : value;
  };
  const [t, bg] = [y(text), y(background)];
  const contrast = bg > t ? (bg ** 0.56 - t ** 0.57) * 1.14 : (bg ** 0.65 - t ** 0.62) * 1.14;
  return Math.abs(contrast) < 0.1 ? 0 : (Math.abs(contrast) - 0.027) * 100;
}

/**
 * White or near-black for words on a fill of this colour, whichever reads better: white on a
 * bright mid-tone such as coral, dark on a light one such as yellow. APCA picks, as it weighs a
 * mid-tone the way the eye does, but only a choice that also reaches WCAG's 3:1 for large or bold
 * text is kept, so a pale orange still gets dark words.
 */
export function inkOn(fill: string): string {
  const preferred = apca(LIGHT_TEXT, fill) >= apca(DARK_TEXT, fill) ? LIGHT_TEXT : DARK_TEXT;
  const other = preferred === LIGHT_TEXT ? DARK_TEXT : LIGHT_TEXT;
  return contrastRatio(preferred, fill) >= 3 ? preferred : other;
}

/** The surfaces each theme draws on, from tokens.css: card, page and the muted wash. */
export const themeSurfaces = {
  light: ["#ffffff", "#f7f7f7", "#f1f1f1"],
  dark: ["#161616", "#0c0c0d", "#1e1e1e"],
} as const;

/** What a brand colour becomes in one theme. */
export interface BrandShades {
  /** Fills a button, a sent message or a launcher: the brand colour itself. */
  fill: string;
  /** Words on `fill`. */
  fillInk: string;
  /** Links, icons, the focus ring and words in the brand colour: readable on the theme's surfaces. */
  text: string;
  /** Lines and drawings in the brand colour, which need 3:1 rather than 4.5:1. */
  graphic: string;
  /** A faint wash for a selected row or a highlight, with `text` readable on it. */
  tint: string;
}

/**
 * The brand colour for light and dark themes: the fill as given everywhere, and the shades of it
 * that keep text, icons and lines readable on each theme's own surfaces.
 */
export function brandShades(fill: string): { light: BrandShades; dark: BrandShades } {
  const colour = toOklch(fill);
  const lightTint = fromOklch({ l: 0.955, c: Math.min(colour.c, 0.035), h: colour.h });
  const darkTint = fromOklch({ l: 0.27, c: Math.min(colour.c, 0.05), h: colour.h });
  return {
    light: {
      fill,
      fillInk: inkOn(fill),
      text: readableShade(fill, [...themeSurfaces.light, lightTint]),
      graphic: readableShade(fill, themeSurfaces.light, 3),
      tint: lightTint,
    },
    dark: {
      fill,
      fillInk: inkOn(fill),
      text: readableShade(fill, [...themeSurfaces.dark, darkTint]),
      graphic: readableShade(fill, themeSurfaces.dark, 3),
      tint: darkTint,
    },
  };
}

const HEX = /^#(?<r>[0-9a-f]{2})(?<g>[0-9a-f]{2})(?<b>[0-9a-f]{2})$/i;

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const groups = HEX.exec(hex)?.groups;
  if (!groups) {
    throw new Error(`Expected a #rrggbb colour, received "${hex}"`);
  }
  const [r, g, b] = [groups.r, groups.g, groups.b].map((part) => channel(parseInt(part ?? "", 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** WCAG 2 contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** A colour as hue (0 to 360), saturation and brightness (each 0 to 1). */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

/** Reads `#rrggbb`. Anything else comes back as black. */
export function hexToHsv(hex: string): Hsv {
  if (!isHex(hex)) return { h: 0, s: 0, v: 0 };
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(
    (start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);

  let h = 0;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const channel = (offset: number) => {
    const k = (offset + h / 60) % 6;
    const value = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

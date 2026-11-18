import { type CSSProperties } from "react";

const DARK_TEXT = "#1c1a16";
const LIGHT_TEXT = "#ffffff";

/** How bright a colour is to the eye, from 0 (black) to 1 (white), as WCAG defines it. */
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** White or near-black, whichever is easier to read on the colour given. */
export function readableOn(accent: string): string {
  const background = luminance(accent);
  return contrast(background, 1) >= contrast(background, luminance(DARK_TEXT))
    ? LIGHT_TEXT
    : DARK_TEXT;
}

/**
 * The style that puts an install's own colour in place of Helpwren's, on an element and
 * everything inside it. Nothing when there is no colour, so the default shows.
 */
export function accentStyle(accent: string | undefined): CSSProperties | undefined {
  if (!accent) return undefined;
  // The tokens themselves, because they are worked out at the top of the page and would not
  // follow a variable they are built from being changed further down.
  return {
    "--primary": accent,
    "--primary-foreground": readableOn(accent),
    "--ring": accent,
  } as CSSProperties;
}

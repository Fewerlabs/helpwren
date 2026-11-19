import { type Brand } from "@helpwren/core";
import { type CSSProperties } from "react";

const DARK_TEXT = "#101a15";
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

/** What paints a large surface in the brand's colour: its gradient if it has one. */
export function brandFill({ accent, accentTo }: Pick<Brand, "accent" | "accentTo">) {
  if (!accent) return undefined;
  return accentTo ? `linear-gradient(135deg, ${accent}, ${accentTo})` : accent;
}

type Colours = Pick<Brand, "accent" | "accentTo" | "button">;

/**
 * The style that puts an install's own colours in place of Helpwren's, on an element and
 * everything inside it. Nothing when it has none, so the defaults show.
 */
export function accentStyle({ accent, accentTo, button }: Colours): CSSProperties | undefined {
  const primary = button ?? accent;
  if (!primary) return undefined;
  // The tokens themselves, because they are worked out at the top of the page and would not
  // follow a variable they are built from being changed further down.
  return {
    // Buttons and the visitor's own messages.
    "--primary": primary,
    "--primary-foreground": readableOn(primary),
    // A brand's own button colour fills buttons in dark mode too.
    "--primary-fill": primary,
    "--primary-fill-foreground": readableOn(primary),
    "--ring": primary,
    ...(accent
      ? {
          // The illustrations' own colours, so a drawing in the chat is in the brand's colour.
          "--moss": accent,
          "--pen": accent,
          "--highlighter": `color-mix(in srgb, ${accent} 28%, transparent)`,
          // For washes and large surfaces, such as the top of the chat page.
          "--brand": accent,
          "--brand-fill": brandFill({ accent, accentTo }),
        }
      : {}),
  } as CSSProperties;
}

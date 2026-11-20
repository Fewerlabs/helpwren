import { type Brand } from "@helpwren/core";
import { type CSSProperties } from "react";

const DARK_TEXT = "#101a15";
const LIGHT_TEXT = "#ffffff";

/**
 * How bright a colour is to the eye, from 0 (black) to 1 (white), the way APCA measures it,
 * with very dark colours lifted a little as the eye sees them.
 */
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map(
    (start) => (Number.parseInt(hex.slice(start, start + 2), 16) / 255) ** 2.4,
  );
  const y = 0.2126729 * red + 0.7151522 * green + 0.072175 * blue;
  return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
}

/**
 * How readable text is on a background, as APCA's lightness contrast (0 to about 106). Unlike
 * WCAG's ratio it weighs white on a mid-tone such as coral or orange as the eye does, so a bright
 * brand colour gets white text and only a light one, such as yellow, gets dark.
 */
function lightnessContrast(text: number, background: number): number {
  const contrast =
    background > text
      ? (background ** 0.56 - text ** 0.57) * 1.14
      : (background ** 0.65 - text ** 0.62) * 1.14;
  return Math.abs(contrast) < 0.1 ? 0 : (Math.abs(contrast) - 0.027) * 100;
}

/** White or near-black, whichever is easier to read on the colour given. */
export function readableOn(accent: string): string {
  const background = luminance(accent);
  return lightnessContrast(luminance(LIGHT_TEXT), background) >=
    lightnessContrast(luminance(DARK_TEXT), background)
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

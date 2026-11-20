import { type Brand } from "@helpwren/core";
import { brandShades, inkOn } from "@helpwren/design-system";
import { type CSSProperties } from "react";

/** White or near-black, whichever is easier to read on the colour given. */
export const readableOn = inkOn;

/** What paints a large surface in the brand's colour: its gradient if it has one. */
export function brandFill({ accent, accentTo }: Pick<Brand, "accent" | "accentTo">) {
  if (!accent) return undefined;
  return accentTo ? `linear-gradient(135deg, ${accent}, ${accentTo})` : accent;
}

type Colours = Pick<Brand, "accent" | "accentTo" | "button">;

/** What puts an install's colours on an element: its style, and the attributes brand.css reads. */
export interface BrandProps {
  style: CSSProperties;
  "data-brand": "";
  "data-brand-accent"?: "";
}

/**
 * The props that put an install's own colours in place of Helpwren's, on an element and
 * everything inside it. Nothing when it has none, so the defaults show.
 *
 * Buttons, the launcher and the visitor's messages are filled with the brand colour itself.
 * Words, icons, links and the focus ring in the brand colour use a shade of it that reads on each
 * theme's surfaces, and brand.css picks the light or the dark one, so a pale brand colour stays
 * readable on white and a dark one on black.
 */
export function brandProps({ accent, accentTo, button }: Colours): BrandProps | undefined {
  const primary = button ?? accent;
  if (!primary) return undefined;
  const shades = brandShades(primary);
  const drawings = accent ? brandShades(accent) : undefined;
  const style = {
    "--brand-button": primary,
    "--brand-button-ink": shades.light.fillInk,
    "--brand-text-light": shades.light.text,
    "--brand-text-ink-light": inkOn(shades.light.text),
    "--brand-text-dark": shades.dark.text,
    "--brand-text-ink-dark": inkOn(shades.dark.text),
    ...(accent && drawings
      ? {
          // The illustrations' strokes, so a drawing in the chat is in the brand's colour.
          "--brand-graphic-light": drawings.light.graphic,
          "--brand-graphic-dark": drawings.dark.graphic,
          // Words and icons in the brand colour, such as the article being read.
          "--brand-accent-text-light": drawings.light.text,
          "--brand-accent-text-dark": drawings.dark.text,
          "--highlighter": `color-mix(in srgb, ${accent} 28%, transparent)`,
          // For washes and large surfaces, such as the top of the chat page.
          "--brand": accent,
          "--brand-fill": brandFill({ accent, accentTo }),
        }
      : {}),
  } as CSSProperties;
  return accent
    ? { style, "data-brand": "", "data-brand-accent": "" }
    : { style, "data-brand": "" };
}

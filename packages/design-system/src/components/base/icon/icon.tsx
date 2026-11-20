import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { registry, type IconGlyphComponent, type IconName } from "./registry";

export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

export interface IconProps extends Omit<ComponentProps<"svg">, "children" | "color" | "name"> {
  /** The icon's name on phosphoricons.com, in kebab-case. */
  name: IconName;
  /** Line weight. `regular` matches the 1.5px line at 24px. */
  weight?: IconWeight;
  /** Flips the icon horizontally, for right-to-left layouts. */
  mirrored?: boolean;
  /**
   * An accessible name. Leave it out for decorative icons, which are hidden from
   * assistive technology. An icon-only button should label the button, not the icon.
   */
  label?: string;
}

/**
 * The one way to render an icon. It follows the surrounding text: `1em` square and
 * `currentColor`, unless a class such as `size-4` or `text-pencil` overrides it.
 */
export function Icon({ name, ...props }: IconProps) {
  return <IconGlyph glyph={registry[name]} {...props} />;
}

export interface IconGlyphProps extends Omit<IconProps, "name"> {
  /** One icon, imported by name from the registry (for example `CopyIcon`). */
  glyph: IconGlyphComponent;
}

/**
 * `Icon` for components that need only a few icons and are sent to the browser: given the
 * icon itself rather than its name, so the page downloads those icons, not the whole set.
 */
export function IconGlyph({
  glyph: Glyph,
  weight = "regular",
  mirrored = false,
  label,
  className,
  ...props
}: IconGlyphProps) {
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: false } as const);

  return (
    <Glyph
      data-slot="icon"
      size="1em"
      color="currentColor"
      weight={weight}
      mirrored={mirrored}
      className={cn("shrink-0", className)}
      {...accessibility}
      {...props}
    />
  );
}

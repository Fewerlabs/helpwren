import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { registry, type IconName } from "./registry";

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
export function Icon({
  name,
  weight = "regular",
  mirrored = false,
  label,
  className,
  ...props
}: IconProps) {
  const Glyph = registry[name];
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

import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import type { IconWeight } from "../icon/icon";

/**
 * Where the app serves each Phosphor icon as an SVG file: `/api/icons/{weight}/{name}.svg`.
 * Storybook serves the same paths, so the components here draw the same in both.
 */
export const ICON_ROUTE = "/api/icons";

/** What a stored name falls back to when it could not be an icon's name at all. */
const FALLBACK = "book-open";

// The shape every Phosphor name has. A name that fails it is never asked for; one that passes
// but names no icon is refused by the route and draws nothing.
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The address of a Phosphor icon's SVG file, under `route`. */
export function iconUrl(
  name: string,
  weight: IconWeight = "regular",
  route: string = ICON_ROUTE,
): string {
  return `${route}/${weight}/${NAME.test(name) ? name : FALLBACK}.svg`;
}

export interface CollectionIconProps extends Omit<ComponentProps<"span">, "children"> {
  /** Any Phosphor icon's name, in kebab-case, such as `rocket-launch`. */
  name: string;
  weight?: IconWeight;
  /**
   * Where the icon files are, in place of `ICON_ROUTE`: for a page another site serves through
   * a rewrite, which passes on only its own paths.
   */
  route?: string;
  /**
   * An accessible name. Leave it out when the icon only decorates text that says the same,
   * as it does beside a collection's name.
   */
  label?: string;
}

/**
 * Any of Phosphor's icons by name, for a choice people make, such as a collection's icon. It is
 * drawn from the icon's file as a mask, so it takes the text colour like `Icon` does, without
 * putting every icon's code into the page. The app's own interface uses `Icon` instead.
 */
export function CollectionIcon({
  name,
  weight = "regular",
  route,
  label,
  className,
  style,
  ...props
}: CollectionIconProps) {
  const image = `url("${iconUrl(name, weight, route)}")`;
  const accessibility = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      data-slot="collection-icon"
      className={cn(
        "inline-block size-[1em] shrink-0 bg-current mask-contain mask-center mask-no-repeat",
        className,
      )}
      style={{ maskImage: image, WebkitMaskImage: image, ...style }}
      {...accessibility}
      {...props}
    />
  );
}

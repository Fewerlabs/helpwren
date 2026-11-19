import { type PublicSettings } from "@helpwren/core";
import { type CSSProperties } from "react";

/**
 * What sits behind the greeting on the help center's home page:
 * - `glow`: a soft wash of the brand's colour in the corner, fading out with no edge
 * - `image`: a banner with the customer's picture, darkened so white words stay readable
 * - `plain`: nothing but the page
 */
export type HeroKind = "glow" | "image" | "plain";

export function heroKind({ helpCenter }: PublicSettings): HeroKind {
  if (helpCenter.headerStyle === "plain") return "plain";
  // A picture style with no picture falls back to the brand's colour.
  return helpCenter.headerStyle === "image" && helpCenter.headerImage ? "image" : "glow";
}

/** The banner's picture under a dark wash, for the `image` kind. */
export function bannerStyle(image: string): CSSProperties {
  return {
    color: "#ffffff",
    backgroundImage: `linear-gradient(rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.5)), url(${JSON.stringify(image)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

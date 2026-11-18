import { type PublicSettings } from "@helpwren/core";
import { type CSSProperties } from "react";

import { brandFill, readableOn } from "@/lib/accent";

/**
 * What paints the band at the top of the help center, and the colour of the words on it:
 * the page's own paper, the brand's colour or gradient, or a picture under a dark wash so
 * white words stay readable whatever the picture is.
 */
export function heroStyle({ brand, helpCenter }: PublicSettings): {
  style: CSSProperties;
  /** True when the band is the page's own colour, so it needs a hairline to end it. */
  plain: boolean;
} {
  if (helpCenter.headerStyle === "image" && helpCenter.headerImage) {
    return {
      plain: false,
      style: {
        color: "#ffffff",
        backgroundImage: `linear-gradient(rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.5)), url(${JSON.stringify(helpCenter.headerImage)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      },
    };
  }
  if (helpCenter.headerStyle === "plain") return { plain: true, style: {} };
  const fill = brandFill(brand);
  return fill && brand.accent
    ? { plain: false, style: { background: fill, color: readableOn(brand.accent) } }
    : // No colour of their own yet: the theme's, which is Helpwren's green until they choose one.
      {
        plain: false,
        style: { background: "var(--primary)", color: "var(--primary-foreground)" },
      };
}

import { Caveat, Figtree, JetBrains_Mono } from "next/font/google";

/** Interface text and the hero headline, which is the largest thing on the first screen. */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
  display: "swap",
});

/** Entry headers, tags and code. Not needed for the first paint. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

/** Margin notes beside drawings only. */
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

/** Class names that expose the font CSS variables the design tokens read. */
export const fontVariables = [figtree.variable, jetbrainsMono.variable, caveat.variable].join(" ");

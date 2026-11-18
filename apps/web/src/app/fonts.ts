import { Caveat, Figtree, JetBrains_Mono } from "next/font/google";

/** Interface text. */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
  display: "swap",
});

/** Code, IDs, labels and shortcuts. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/** Margin notes beside illustrations only, so it is not preloaded. */
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

/** Class names that expose the font CSS variables the design tokens read. */
export const fontVariables = [figtree.variable, jetbrainsMono.variable, caveat.variable].join(" ");

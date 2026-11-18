import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Utilities defined in tokens/theme.css that tailwind-merge cannot know about.
// Without this, `text-2xs` would be mistaken for a text colour and dropped.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs"] }],
      "border-w": ["border-line"],
    },
  },
});

/** Joins class names and resolves conflicting Tailwind utilities; the last one wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

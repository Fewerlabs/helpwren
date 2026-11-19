// Every Phosphor icon with its tags. The picker loads this module only when it opens, so the
// list stays out of every page that never shows the picker.
import { icons, type IconEntry as PhosphorEntry } from "@phosphor-icons/core";

import type { IconEntry } from "./search";

// Phosphor marks recent icons with these. They describe the release, not the picture.
const RELEASE_TAGS = new Set(["*new*", "*updated*"]);

function labelOf(name: string): string {
  const words = name.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Read as plain entries: the package types each of its 1,500 icons separately.
const phosphor: readonly PhosphorEntry[] = icons;

export const catalogue: readonly IconEntry[] = phosphor.map((icon) => ({
  name: icon.name,
  label: labelOf(icon.name),
  keywords: [
    ...icon.tags.filter((tag) => !RELEASE_TAGS.has(tag)).map((tag) => tag.toLowerCase()),
    ...icon.categories,
    ...(icon.alias ? [icon.alias.name] : []),
  ],
  alias: icon.alias?.name,
}));

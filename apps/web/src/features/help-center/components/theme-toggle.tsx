"use client";

import { Icon } from "@helpwren/design-system";

import { toggleTheme, useTheme } from "@/lib/theme";

/** Lets a reader switch the help center between light and dark, whatever their device prefers. */
export function ThemeToggle() {
  const theme = useTheme();
  const label = theme === "dark" ? "Switch to light" : "Switch to dark";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="focus-visible:outline-ring grid size-9 place-items-center rounded-lg opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2"
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        toggleTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="size-4.5" />
    </button>
  );
}

"use client";

import { Icon, Tooltip } from "@helpwren/design-system";

import { toggleTheme, useTheme } from "@/lib/theme";

/** Switches the dashboard between light and dark. The new theme spreads out from the button. */
export function ThemeToggle() {
  const theme = useTheme();
  const label = theme === "dark" ? "Switch to light" : "Switch to dark";

  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        aria-label={label}
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          toggleTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
        }}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} className="size-5" />
      </button>
    </Tooltip>
  );
}

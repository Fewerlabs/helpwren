"use client";

import { Button, Icon, Tooltip } from "@helpwren/design-system";
import { useEffect } from "react";

import { useSetTheme, useTheme } from "../store/theme-store";

/**
 * Switches between the light and dark themes by setting the `dark` class on the
 * document, which is what the design tokens respond to.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const setTheme = useSetTheme();
  const next = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <Tooltip content={`Switch to ${next} theme`}>
      <Button
        variant="secondary"
        size="icon"
        aria-label={`Switch to ${next} theme`}
        onClick={() => {
          setTheme(next);
        }}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} />
      </Button>
    </Tooltip>
  );
}

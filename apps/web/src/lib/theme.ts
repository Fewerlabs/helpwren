import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The theme on screen. Light on the server, where the person's choice is not known. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is blocked: the choice lasts until the page is left.
  }
  for (const listener of listeners) listener();
}

/**
 * Switches between light and dark. Where the browser can, the new theme spreads across the
 * page as a circle growing from `origin`, the point that was pressed. People who prefer
 * reduced motion, and browsers without view transitions, get a plain switch.
 */
export function toggleTheme(origin: { x: number; y: number }) {
  const next: Theme = current() === "dark" ? "light" : "dark";
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || typeof document.startViewTransition !== "function") {
    apply(next);
    return;
  }

  // Far enough to reach the corner of the window furthest from where the circle starts.
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const transition = document.startViewTransition(() => {
    apply(next);
  });
  void transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${origin.x}px ${origin.y}px)`,
          `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
        ],
      },
      {
        duration: 650,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
}

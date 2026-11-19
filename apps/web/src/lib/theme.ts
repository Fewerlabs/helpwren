import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY } from "./theme-script";

/** The theme on screen. */
export type Theme = "light" | "dark";

/** What the person chose: a theme of their own, or whatever their device prefers. */
export type ThemePreference = Theme | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function stored(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function deviceTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function notify() {
  for (const listener of listeners) listener();
}

// While the choice is the device's, a change on the device shows at once.
function onDeviceChange() {
  if (stored() === "system") {
    document.documentElement.classList.toggle("dark", deviceTheme() === "dark");
    notify();
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0)
    window.matchMedia(DARK_QUERY).addEventListener("change", onDeviceChange);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.matchMedia(DARK_QUERY).removeEventListener("change", onDeviceChange);
    }
  };
}

/** The theme on screen. Light on the server, where the person's choice is not known. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}

/** What the person chose. The device's on the server, where their choice is not known. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, stored, () => "system");
}

function save(preference: ThemePreference) {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage is blocked: the choice lasts until the page is left.
  }
}

/**
 * Sets the theme: light, dark, or whatever the device prefers. When that changes what is on
 * screen, and the browser can, the new theme spreads across the page as a circle growing from
 * `origin`, the point that was pressed. People who prefer reduced motion, and browsers without
 * view transitions, get a plain switch.
 */
export function setThemePreference(preference: ThemePreference, origin: { x: number; y: number }) {
  save(preference);
  const next = preference === "system" ? deviceTheme() : preference;
  const apply = () => {
    document.documentElement.classList.toggle("dark", next === "dark");
    notify();
  };

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (next === current() || still || typeof document.startViewTransition !== "function") {
    apply();
    return;
  }

  // Far enough to reach the corner of the window furthest from where the circle starts.
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const transition = document.startViewTransition(apply);
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

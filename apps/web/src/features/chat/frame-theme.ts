import { CHAT_THEMES, type ChatTheme } from "helpwren/protocol";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The theme the chat in a frame was asked for, from its address. Light unless the page asked
 * otherwise: the chat sits inside someone else's page, which may not follow the device.
 */
export function frameTheme(value: unknown): ChatTheme {
  return CHAT_THEMES.find((theme) => theme === value) ?? "light";
}

/**
 * The script that sets the theme before anything is drawn, so the chat never flashes the other
 * one. `theme` was checked by `frameTheme`, so it is safe to write into a script.
 */
export function frameThemeScript(theme: ChatTheme): string | null {
  if (theme === "light") return null;
  const dark = theme === "dark" ? "true" : `matchMedia(${JSON.stringify(DARK_QUERY)}).matches`;
  return `document.documentElement.classList.toggle("dark",${dark})`;
}

/**
 * Shows the chat in a theme, and with `system`, keeps it in step with the device. Returns a
 * function that stops following the device.
 */
export function applyFrameTheme(theme: ChatTheme): () => void {
  const root = document.documentElement;
  if (theme !== "system") {
    root.classList.toggle("dark", theme === "dark");
    return () => undefined;
  }
  const device = window.matchMedia(DARK_QUERY);
  const follow = () => root.classList.toggle("dark", device.matches);
  follow();
  device.addEventListener("change", follow);
  return () => {
    device.removeEventListener("change", follow);
  };
}

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the screen matches a media query, such as `(min-width: 64rem)`, kept up to date as
 * the window is resized. For choosing what to mount, where hiding with CSS would still run it.
 * The server cannot know the screen, so the first render says `false` everywhere.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

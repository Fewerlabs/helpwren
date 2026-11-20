import { useEffect, useState } from "react";

/** How much of a drawing must be on screen before it starts drawing itself. */
const THRESHOLD = 0.3;

/**
 * Where a drawing is, for an illustration that draws itself when it scrolls into view.
 * - `still`: not decided yet (the server, the first render, a browser without
 *   IntersectionObserver), shown as drawn.
 * - `waiting`: below the screen, hidden, ready to draw.
 * - `drawing`: on screen now, drawing itself, then living quietly.
 * - `idle`: was already on screen when the page opened, so it is not drawn again, only lives.
 */
export type InViewStage = "still" | "waiting" | "drawing" | "idle";

/**
 * Watches an element for an illustration that draws itself in view. Pass the element (from a
 * callback ref kept in state). `visible` says whether it is on screen now, so its small
 * movements can pause while it is not.
 */
export function useInViewStage(
  element: Element | null,
  enabled: boolean,
): { stage: InViewStage; visible: boolean } {
  const [stage, setStage] = useState<InViewStage>("still");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!enabled || !element || typeof IntersectionObserver !== "function") return;
    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (first) {
          first = false;
          // Already in view as the page opens: drawing it again would make it flash.
          setStage((current) =>
            current === "still" ? (entry.isIntersecting ? "idle" : "waiting") : current,
          );
          return;
        }
        if (entry.intersectionRatio >= THRESHOLD) {
          setStage((current) => (current === "waiting" ? "drawing" : current));
        }
      },
      { threshold: [0, THRESHOLD] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [enabled, element]);

  return { stage, visible };
}

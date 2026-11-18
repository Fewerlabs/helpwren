import { useEffect, useState } from "react";

function scrolls(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  const canScroll = (overflow: string) => overflow === "auto" || overflow === "scroll";
  return (
    (canScroll(style.overflowY) && element.scrollHeight > element.clientHeight) ||
    (canScroll(style.overflowX) && element.scrollWidth > element.clientWidth)
  );
}

/**
 * Lets a keyboard reach a box that scrolls. A scrolling box with nothing focusable inside
 * cannot be scrolled without a mouse, so while the content overflows this makes the box itself
 * a tab stop, where the arrow keys scroll it. Spread the result onto the element:
 *
 *   const scrollable = useScrollableFocus<HTMLDivElement>();
 *   <div {...scrollable} className="overflow-y-auto" />
 */
export function useScrollableFocus<Element extends HTMLElement>() {
  const [element, setElement] = useState<Element | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const measure = () => {
      setOverflowing(scrolls(element));
    };
    // The box changes size with the layout; its children change size as content arrives.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.children) {
      observer.observe(child);
    }
    measure();
    return () => {
      observer.disconnect();
    };
  }, [element]);

  return { ref: setElement, tabIndex: overflowing ? 0 : undefined };
}

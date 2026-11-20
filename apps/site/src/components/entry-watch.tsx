"use client";

import { useEffect } from "react";

/** The line, as a share of the screen's height, an entry's top crosses as the wren lands in it. */
const LANDING_LINE = 0.45;

/**
 * Marks each journal entry with data-in-view, once, when its top reaches the line where the wren
 * lands, so the entry's own action plays (the price struck out, the plug pushed in, the snippet
 * typed). It goes by the entry's scroll position, not by the wren: jumping past an entry, by a
 * link or find in page, still shows it complete. An entry already above the screen when the page
 * opens is marked at once, settled.
 */
export function EntryWatch() {
  useEffect(() => {
    const entries = [...document.querySelectorAll<HTMLElement>("[data-entry]")];
    const mark = (element: Element) => {
      element.setAttribute("data-in-view", "");
    };
    const line = window.innerHeight * LANDING_LINE;
    // Without IntersectionObserver every entry is simply shown complete.
    if (typeof IntersectionObserver !== "function") {
      for (const entry of entries) mark(entry);
      return;
    }
    for (const entry of entries) if (entry.getBoundingClientRect().top < line) mark(entry);
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting || record.boundingClientRect.top < line) {
            mark(record.target);
            observer.unobserve(record.target);
          }
        }
      },
      { rootMargin: `0px 0px -${String(Math.round((1 - LANDING_LINE) * 100))}% 0px` },
    );
    for (const entry of entries) if (!entry.hasAttribute("data-in-view")) observer.observe(entry);
    return () => {
      observer.disconnect();
    };
  }, []);
  return null;
}

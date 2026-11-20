"use client";

import { useEffect } from "react";

/**
 * Marks the sticky header once the page has scrolled, so its hairline shows only then. Reads
 * the scroll position, so it works the same with smooth scrolling (Lenis moves the real scroll).
 */
export function HeaderScroll() {
  useEffect(() => {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;
    const mark = () => {
      header.toggleAttribute("data-scrolled", window.scrollY > 4);
    };
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return () => {
      window.removeEventListener("scroll", mark);
    };
  }, []);
  return null;
}

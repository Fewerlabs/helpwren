"use client";

import { useRef, type RefObject } from "react";

import { useGSAP } from "./kit";

/**
 * Runs a section's motion once, with the section's element, through useGSAP: every tween,
 * ScrollTrigger and SplitText made inside is reverted when the section's motion unmounts. Returns
 * the ref for the marker element the motion component renders inside its section.
 */
export function useSectionTimeline(
  setup: (section: HTMLElement) => void,
): RefObject<HTMLSpanElement | null> {
  const marker = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const section = marker.current?.closest<HTMLElement>("[data-entry]");
    if (section) setup(section);
  });
  return marker;
}

"use client";

import { revealEntry } from "./helpers";
import { useSectionTimeline } from "./use-section-timeline";

/** The GSAP side of an entry's motion, loaded only when motion is allowed. */
export function EntryTimeline() {
  const marker = useSectionTimeline((section) => {
    revealEntry(section);
  });
  return <span ref={marker} hidden />;
}

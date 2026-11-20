"use client";

import { revealEntry } from "@/motion/helpers";
import { useSectionTimeline } from "@/motion/use-section-timeline";

/** The motion of the anatomy entry: GSAP, loaded only when motion is allowed. */
export function AnatomyTimeline() {
  const marker = useSectionTimeline((section) => {
    revealEntry(section);
  });
  return <span ref={marker} hidden />;
}

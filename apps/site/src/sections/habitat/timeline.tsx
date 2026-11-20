"use client";

import { revealEntry } from "@/motion/helpers";
import { useSectionTimeline } from "@/motion/use-section-timeline";

/** The motion of the habitat entry: GSAP, loaded only when motion is allowed. */
export function HabitatTimeline() {
  const marker = useSectionTimeline((section) => {
    revealEntry(section);
  });
  return <span ref={marker} hidden />;
}

"use client";

import { entryTimeline, revealEntry, riseIn } from "@/motion/helpers";
import { useSectionTimeline } from "@/motion/use-section-timeline";

/** The motion of the last entry: GSAP, loaded only when motion is allowed. */
export function JoinTimeline() {
  const marker = useSectionTimeline((section) => {
    revealEntry(section);
    const note = section.querySelector("[data-slot='margin-note']");
    const timeline = note ? entryTimeline(note, "top 90%") : null;
    if (note && timeline) riseIn(timeline, [note], 0);
  });
  return <span ref={marker} hidden />;
}

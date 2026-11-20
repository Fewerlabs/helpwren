"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "./gate";

const Timeline = dynamic(() => import("./entry-timeline").then((module) => module.EntryTimeline), {
  ssr: false,
});

/**
 * An entry's scroll motion: its heading rises line by line, its tags, tape and margin notes
 * settle. Loaded once motion is allowed and the page has settled. Every entry uses this one
 * component; what an entry does when the wren lands is in its own markup and the stylesheet
 * (data-in-view), and the drawings animate through the design system.
 */
export function EntryMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

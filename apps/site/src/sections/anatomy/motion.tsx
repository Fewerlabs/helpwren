"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.AnatomyTimeline), {
  ssr: false,
});

/** Loads the motion of the anatomy entry once motion is allowed and the page has settled. */
export function AnatomyMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

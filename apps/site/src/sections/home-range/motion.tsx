"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.HomeRangeTimeline), {
  ssr: false,
});

/** Loads the motion of the home-range entry once motion is allowed and the page has settled. */
export function HomeRangeMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

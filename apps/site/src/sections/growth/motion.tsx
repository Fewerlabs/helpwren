"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.GrowthTimeline), {
  ssr: false,
});

/** Loads the motion of the growth stages once motion is allowed and the page has settled. */
export function GrowthMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

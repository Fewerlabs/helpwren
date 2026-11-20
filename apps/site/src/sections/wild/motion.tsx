"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.WildTimeline), {
  ssr: false,
});

/** Loads the motion of the wild entry once motion is allowed and the page has settled. */
export function WildMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

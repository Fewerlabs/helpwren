"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.JoinTimeline), {
  ssr: false,
});

/** Loads the motion of the last entry once motion is allowed and the page has settled. */
export function JoinMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

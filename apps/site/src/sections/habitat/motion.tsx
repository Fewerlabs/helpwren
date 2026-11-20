"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.HabitatTimeline), {
  ssr: false,
});

/** Loads the motion of the habitat entry once motion is allowed and the page has settled. */
export function HabitatMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

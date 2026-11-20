"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.FieldGuideTimeline), {
  ssr: false,
});

/** Loads the motion of the field-guide plate once motion is allowed and the page has settled. */
export function FieldGuideMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "@/motion/gate";

const Timeline = dynamic(() => import("./timeline").then((module) => module.NestTimeline), {
  ssr: false,
});

/** Loads the motion of the nest entry once motion is allowed and the page has settled. */
export function NestMotion() {
  return (
    <MotionGate>
      <Timeline />
    </MotionGate>
  );
}

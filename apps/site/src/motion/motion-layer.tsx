"use client";

import dynamic from "next/dynamic";

import { MotionGate } from "./gate";

const Engine = dynamic(() => import("./engine").then((module) => module.MotionEngine), {
  ssr: false,
});

/** The page-wide part of the motion layer: smooth scrolling and the "on" mark. */
export function MotionLayer() {
  return (
    <MotionGate>
      <Engine />
    </MotionGate>
  );
}

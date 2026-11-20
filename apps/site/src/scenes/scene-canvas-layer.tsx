"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { useMotionReady } from "@/motion/preference";

import { capable } from "./scene-slot";

const SceneCanvas = dynamic(() => import("./scene-canvas").then((module) => module.SceneCanvas), {
  ssr: false,
});

const noop = () => () => undefined;

/** The page's one WebGL canvas, on capable devices once motion is allowed. */
export function SceneCanvasLayer() {
  const ready = useMotionReady();
  const able = useSyncExternalStore(noop, capable, () => false);
  return ready && able ? <SceneCanvas /> : null;
}

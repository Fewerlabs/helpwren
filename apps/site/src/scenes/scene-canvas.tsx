"use client";

import { View } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";

/**
 * The page's one WebGL canvas, fixed over the screen. The hero's branch, the anatomy stack and
 * the flying wren are each a drei View: a DOM element on the page whose 3D content this canvas
 * draws, scissored to that element. One renderer, one context, frames only on demand.
 */
export function SceneCanvas() {
  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 30 }}
      aria-hidden="true"
    >
      <View.Port />
    </Canvas>
  );
}

/** Calls `onReady` once, just after the first frame has been drawn. */
export function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(onReady);
    });
  });
  return null;
}

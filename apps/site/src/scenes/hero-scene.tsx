"use client";

import { Line } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";

import { HERO_VIEWBOX, heroStrokes } from "@/sections/hero/hero-strokes";

import { sampleStroke, useBoil, useInk, useOnScreen, wobble } from "./lines";

/** The camera's vertical field of view, in degrees. */
const FOV = 30;
/** How far the camera is from the plane the branch lies in, so that plane fills the view. */
const DISTANCE = HERO_VIEWBOX.height / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
/** How far the camera drifts down and in as the hero scrolls away, in drawing units. */
const DRIFT_DOWN = 26;
const DRIFT_IN = 40;
/** The pen's width, in pixels, as in the drawings. */
const LINE_WIDTH = 1.6;

/** A drawing point to a 3D point at `depth` that lands on the same spot of the screen at rest. */
function place(x: number, y: number, depth: number): [number, number, number] {
  const scale = (DISTANCE - depth) / DISTANCE;
  return [(x - HERO_VIEWBOX.width / 2) * scale, (HERO_VIEWBOX.height / 2 - y) * scale, depth];
}

function Branch() {
  const { invalidate, camera, gl } = useThree();
  const { ink, moss } = useInk();
  const onScreen = useOnScreen(gl.domElement);
  const strokes = useMemo(
    () =>
      heroStrokes.flatMap((stroke) =>
        sampleStroke(stroke.d).map((points) => ({ ...stroke, points })),
      ),
    [],
  );
  const boilStep = useMemo(() => ({ value: 0 }), []);
  const withWobble = useMemo(() => wobble(boilStep), [boilStep]);
  useBoil(onScreen, boilStep, invalidate);

  // The camera drifts as the hero scrolls away: near lines move more than far ones.
  useEffect(() => {
    const hero = gl.domElement.closest("section");
    const update = () => {
      const height = hero?.offsetHeight ?? window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / height));
      camera.position.set(0, -progress * DRIFT_DOWN, DISTANCE - progress * DRIFT_IN);
      camera.lookAt(0, -progress * DRIFT_DOWN, 0);
      invalidate();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, [camera, gl, invalidate]);

  // Give the context back as soon as the scene goes, rather than when the browser gets round to it.
  useEffect(
    () => () => {
      gl.forceContextLoss();
    },
    [gl],
  );

  return (
    <>
      {strokes.map((stroke, strokeIndex) => (
        <Line
          key={`${stroke.d}-${String(strokeIndex)}`}
          ref={withWobble}
          points={stroke.points.map(([x, y]) => place(x, y, stroke.depth))}
          color={stroke.tone === "moss" ? moss : ink}
          lineWidth={LINE_WIDTH}
          transparent={stroke.opacity !== undefined}
          opacity={stroke.opacity ?? 1}
        />
      ))}
    </>
  );
}

/** The hero's branch in perspective: the same lines as the drawing, with depth. */
export function HeroScene({ onReady }: { onReady: () => void }) {
  const ready = useCallback(() => {
    // One frame after creation, so the first frame has been drawn before the drawing hides.
    requestAnimationFrame(() => {
      requestAnimationFrame(onReady);
    });
  }, [onReady]);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: FOV, position: [0, 0, DISTANCE], near: 1, far: DISTANCE * 3 }}
      onCreated={ready}
      style={{ position: "absolute", inset: 0 }}
    >
      <Branch />
    </Canvas>
  );
}

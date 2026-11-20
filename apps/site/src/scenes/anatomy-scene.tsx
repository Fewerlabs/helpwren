"use client";

import { Html, Line } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";

import { contents, outlinePath } from "@/sections/anatomy/anatomy-sketch";
import { ANATOMY_VIEWBOX, anatomyLayers, PLANE } from "@/sections/anatomy/layers";

import { sampleStroke, useBoil, useInk, useOnScreen, wobble } from "./lines";

const FOV = 30;
const DISTANCE = ANATOMY_VIEWBOX.height / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
const LINE_WIDTH = 1.6;
/** How much further apart the planes move as the entry scrolls through, as a share of the gap. */
const SPREAD = 0.45;
/** How far the stack turns as it opens, in radians. */
const TURN = 0.14;
/** Where each plane's leader line starts (its right corner) and how long it is, in drawing units. */
const LEADER_FROM = PLANE.centreX + PLANE.width / 2 - ANATOMY_VIEWBOX.width / 2;
const LEADER_LENGTH = 18;

function Stack() {
  const { invalidate, gl } = useThree();
  const { ink, moss } = useInk();
  const onScreen = useOnScreen(gl.domElement);
  const boilStep = useMemo(() => ({ value: 0 }), []);
  const withWobble = useMemo(() => wobble(boilStep), [boilStep]);
  useBoil(onScreen, boilStep, invalidate);
  const planes = useRef<(Group | null)[]>([]);
  const stack = useRef<Group>(null);

  // Every plane drawn around its own centre, so it can be moved as one piece.
  const layers = useMemo(
    () =>
      anatomyLayers.map((layer, index) => {
        const centreY = PLANE.firstY + index * PLANE.gap;
        const toLocal = ([x, y]: readonly [number, number]) =>
          [x - ANATOMY_VIEWBOX.width / 2, centreY - y, 0] as const;
        return {
          id: layer.id,
          centreY,
          outline: sampleStroke(outlinePath(centreY)).map((points) => points.map(toLocal)),
          inside: sampleStroke(contents(index, centreY)).map((points) => points.map(toLocal)),
        };
      }),
    [],
  );

  // The planes open out as the entry scrolls through the screen.
  useEffect(() => {
    const section = gl.domElement.closest("section");
    const update = () => {
      const box = section?.getBoundingClientRect();
      const progress = box
        ? Math.min(
            1,
            Math.max(0, (window.innerHeight - box.top) / (window.innerHeight + box.height)),
          )
        : 0;
      const middle = (anatomyLayers.length - 1) / 2;
      layers.forEach((layer, index) => {
        const group = planes.current[index];
        if (!group) return;
        const restY = ANATOMY_VIEWBOX.height / 2 - layer.centreY;
        group.position.y = restY + (middle - index) * PLANE.gap * SPREAD * progress;
      });
      if (stack.current) stack.current.rotation.y = progress * TURN;
      invalidate();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, [gl, invalidate, layers]);

  useEffect(
    () => () => {
      gl.forceContextLoss();
    },
    [gl],
  );

  return (
    <group ref={stack}>
      {layers.map((layer, index) => (
        <group
          key={layer.id}
          ref={(group) => {
            planes.current[index] = group;
          }}
        >
          {[...layer.outline, ...layer.inside].map((points, strokeIndex) => (
            <Line
              key={strokeIndex}
              ref={withWobble}
              points={points.map(([x, y, z]) => [x, y, z])}
              color={index === 3 && strokeIndex >= layer.outline.length ? moss : ink}
              lineWidth={LINE_WIDTH}
            />
          ))}
          {/* A leader line from the plane's right corner to its label, which is real text. */}
          <Line
            ref={withWobble}
            points={[
              [LEADER_FROM, 0, 0],
              [LEADER_FROM + LEADER_LENGTH, 0, 0],
            ]}
            color={ink}
            lineWidth={1}
            transparent
            opacity={0.6}
          />
          <Html
            position={[LEADER_FROM + LEADER_LENGTH + 4, 0, 0]}
            center={false}
            style={{ transform: "translateY(-50%)", pointerEvents: "none", whiteSpace: "nowrap" }}
            zIndexRange={[20, 0]}
          >
            <span className="font-hand text-muted-foreground text-lg leading-none">
              {String(index + 1)}. {anatomyLayers[index]?.name}
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}

/** The anatomy entry's exploded stack: the drawing's planes, opening out as you scroll. */
export function AnatomyScene({ onReady }: { onReady: () => void }) {
  const ready = useCallback(() => {
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
      <Stack />
    </Canvas>
  );
}

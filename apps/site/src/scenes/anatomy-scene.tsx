"use client";

import { Line, PerspectiveCamera, View } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3, type Group } from "three";

import { contents, outlinePath } from "@/sections/anatomy/anatomy-sketch";
import { ANATOMY_VIEWBOX, anatomyLayers, PLANE } from "@/sections/anatomy/layers";

import { sampleStroke, useBoil, useInk, useOnScreen, wobble } from "./lines";
import { FirstFrame } from "./scene-canvas";

const FOV = 30;
/** A little further back than the drawing's own framing, so the opened stack stays in view. */
const ZOOM_OUT = 1.22;
const DISTANCE = (ANATOMY_VIEWBOX.height / 2 / Math.tan(((FOV / 2) * Math.PI) / 180)) * ZOOM_OUT;
const LINE_WIDTH = 1.6;
/** How much further apart the planes move as the entry scrolls through, as a share of the gap. */
const SPREAD = 0.45;
/** How far the stack turns as it opens, in radians. */
const TURN = 0.14;
/** Where each plane's leader line starts (its right corner) and how long it is, in drawing units. */
const LEADER_FROM = PLANE.centreX + PLANE.width / 2 - ANATOMY_VIEWBOX.width / 2;
const LEADER_LENGTH = 18;

function Stack({ host }: { host: HTMLElement }) {
  const { invalidate, camera, size } = useThree();
  const { ink, moss } = useInk();
  const onScreen = useOnScreen(host);
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
    const section = host.closest("section");
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
  }, [host, invalidate, layers]);

  // The names beside the drawing follow the ends of the leader lines, so they stay real text.
  const end = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const labels = (host.parentElement ?? host).querySelectorAll<HTMLElement>(
      "[data-anatomy-label]",
    );
    planes.current.forEach((group, index) => {
      const label = labels[index];
      if (!group || !label) return;
      end.set(LEADER_FROM + LEADER_LENGTH + 3, 0, 0);
      group.localToWorld(end);
      end.project(camera);
      const x = ((end.x + 1) / 2) * size.width;
      const y = ((1 - end.y) / 2) * size.height;
      label.style.transform = `translate(${String(x)}px, ${String(y)}px) translateY(-50%)`;
    });
  });

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
        </group>
      ))}
    </group>
  );
}

/**
 * The anatomy entry's exploded stack: the drawing's planes, opening out as you scroll, with
 * leader lines to their names. A View of the page's one canvas.
 */
export function AnatomyScene({ onReady, host }: { onReady: () => void; host: HTMLElement }) {
  return (
    <View className="absolute inset-0">
      <PerspectiveCamera
        makeDefault
        fov={FOV}
        position={[0, 0, DISTANCE]}
        near={1}
        far={DISTANCE * 3}
      />
      <Stack host={host} />
      <FirstFrame onReady={onReady} />
    </View>
  );
}

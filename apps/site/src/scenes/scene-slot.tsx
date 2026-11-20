"use client";

import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";

import { useMotionReady } from "@/motion/preference";

/*
 * Where a Three.js scene may appear: over its still SVG drawing, which is what everyone sees
 * first and what stays for phones, slow devices, reduced motion and browsers without WebGL2.
 */

/** Only on screens at least this wide. */
const MIN_WIDTH = 768;
/** Devices that report less memory than this, in GB, keep the drawing. */
const MIN_MEMORY_GB = 4;
/** Devices with fewer cores keep the drawing. */
const MIN_CORES = 4;
/** Start loading when the scene is within this much of the screen. */
const NEAR = "100% 0px";

/** Whether this device can draw the 3D scenes comfortably. */
export function capable(): boolean {
  if (window.innerWidth < MIN_WIDTH) return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData === true) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < MIN_MEMORY_GB) return false;
  if (nav.hardwareConcurrency < MIN_CORES) return false;
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

const scenes = {
  hero: lazy(() => import("./hero-scene").then((module) => ({ default: module.HeroScene }))),
  anatomy: lazy(() =>
    import("./anatomy-scene").then((module) => ({ default: module.AnatomyScene })),
  ),
} satisfies Record<string, ComponentType<{ onReady: () => void; host: HTMLElement }>>;

/**
 * Holds the still drawing, and when everything allows it, a 3D scene drawn over it. The drawing
 * fades out only once the scene has drawn its first frame, so there is never a gap.
 */
export function SceneSlot({
  scene,
  children,
}: {
  scene: keyof typeof scenes;
  children: ReactNode;
}) {
  const ready = useMotionReady();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!ready || !element || !capable()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: NEAR },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ready, element]);

  const Scene = scenes[scene];
  const live = ready && near;
  return (
    <div
      ref={setElement}
      className="relative"
      data-scene-slot={scene}
      data-scene-live={live && drawn ? "" : undefined}
    >
      <div
        className="transition-opacity duration-500"
        style={{ opacity: live && drawn ? 0 : 1 }}
        data-scene-still
      >
        {children}
      </div>
      {live ? (
        <div className="absolute inset-0" aria-hidden="true">
          <Suspense fallback={null}>
            {element ? (
              <Scene
                host={element}
                onReady={() => {
                  setDrawn(true);
                }}
              />
            ) : null}
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}

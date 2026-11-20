"use client";

import { useEffect, useState } from "react";

/*
 * Shared by the 3D scenes: turning the SVG drawings' paths into points, the hand-drawn "boil",
 * and the theme's ink colours.
 */

/** Points sampled per 100 units of path, enough for smooth curves. */
const SAMPLES_PER_100 = 18;
/** How often the lines are redrawn with a new wobble, like hand-drawn animation: 8 a second. */
export const BOIL_MS = 125;
/** How far a point wanders in a boil, in drawing units. */
const BOIL_AMOUNT = 0.55;

export type Point2 = readonly [number, number];

/** Each subpath of an SVG path as points along it, in the path's own coordinates. */
export function sampleStroke(d: string): Point2[][] {
  const subpaths = d.match(/M[^M]*/g) ?? [];
  const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  return subpaths.map((part) => {
    svgPath.setAttribute("d", part);
    const length = svgPath.getTotalLength();
    const count = Math.max(4, Math.ceil((length / 100) * SAMPLES_PER_100));
    const points: Point2[] = [];
    for (let i = 0; i <= count; i++) {
      const point = svgPath.getPointAtLength((length * i) / count);
      points.push([point.x, point.y]);
    }
    return points;
  });
}

/** The boil's state, shared by every line of a scene: which step of the hand-drawn wobble. */
export interface BoilUniform {
  value: number;
}

const patched = new WeakSet<object>();

/**
 * Gives a fat line's material the hand-drawn wobble, in its vertex shader: each point is pushed a
 * little by a smooth function of where it is and of the boil step, so the line "boils" like
 * hand-drawn animation. Pass it as the line's ref.
 */
export function wobble(uniform: BoilUniform) {
  return (line: { material?: unknown } | null) => {
    const material = line?.material as
      { onBeforeCompile: (shader: ShaderLike) => void; needsUpdate: boolean } | undefined;
    if (!material || patched.has(material)) return;
    patched.add(material);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uBoil = uniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          "void main() {",
          `uniform float uBoil;
vec3 hwWobble(vec3 p) {
  return vec3(
    sin(p.y * 0.35 + p.x * 0.11 + uBoil * 2.3),
    sin(p.x * 0.31 - p.y * 0.07 + uBoil * 1.7),
    0.0
  ) * ${String(BOIL_AMOUNT)};
}
void main() {`,
        )
        .replace(
          "vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );",
          "vec4 start = modelViewMatrix * vec4( instanceStart + hwWobble( instanceStart ), 1.0 );",
        )
        .replace(
          "vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );",
          "vec4 end = modelViewMatrix * vec4( instanceEnd + hwWobble( instanceEnd ), 1.0 );",
        );
    };
    material.needsUpdate = true;
  };
}

interface ShaderLike {
  uniforms: Record<string, unknown>;
  vertexShader: string;
}

function read(): { ink: string; moss: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    ink: style.getPropertyValue("--foreground").trim() || "#1a1a1a",
    moss: style.getPropertyValue("--moss").trim() || "#3d6b57",
  };
}

/** The theme's ink and moss, kept up to date when the theme changes. */
export function useInk(): { ink: string; moss: string } {
  const [colours, setColours] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColours(read());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
    };
  }, []);
  return colours;
}

/** Steps the shared boil uniform at the boil rate while `active` (the scene is on screen). */
export function useBoil(active: boolean, uniform: BoilUniform, onTick: () => void) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      uniform.value += 1;
      onTick();
    }, BOIL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [active, uniform, onTick]);
}

/** Whether an element is on screen, for pausing a scene that has scrolled away. */
export function useOnScreen(element: Element | null): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);
  return visible;
}

"use client";

/*
 * What the flight knows about the wren each frame, shared with whatever draws it: the SVG wren,
 * or the 3D one. The flight writes it; the drawing reads it. Plain data, no React state, so
 * writing it every frame costs nothing.
 */

export type WrenMode = "perched" | "climbing" | "gliding" | "landing" | "asleep" | "inside";

export interface WrenFrame {
  /** Where the feet are, in page pixels. */
  x: number;
  y: number;
  /** How large the wren is drawn, in pixels (the logo's box). */
  size: number;
  /** 1 facing right, -1 facing left. */
  direction: 1 | -1;
  mode: WrenMode;
  /** The perch it is at, when it is at one. */
  here: string;
  /** Goes up each time the live chat opens, so the wren can hop. */
  reacts: number;
  /** Set once the flight has measured the route. */
  ready: boolean;
}

export const wrenFrame: WrenFrame = {
  x: 0,
  y: 0,
  size: 72,
  direction: 1,
  mode: "perched",
  here: "",
  reacts: 0,
  ready: false,
};

const listeners = new Set<() => void>();

/** Called by the flight after it has updated the frame. */
export function publishWrenFrame() {
  for (const listener of listeners) listener();
}

/** Runs `listener` whenever the flight updates the frame. Returns a function that stops it. */
export function onWrenFrame(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

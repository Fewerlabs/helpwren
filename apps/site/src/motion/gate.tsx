"use client";

import type { ReactNode } from "react";

import { useMotionReady } from "./preference";

/**
 * Shows its children, which load the motion code, only once motion is allowed and the page has
 * settled. With reduced motion or the footer switch off they never load; turning the switch off
 * unmounts them, which reverts every animation they made.
 */
export function MotionGate({ children }: { children: ReactNode }) {
  return useMotionReady() ? children : null;
}

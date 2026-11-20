"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { MotionGate } from "@/motion/gate";

const Flight = dynamic(() => import("./flight").then((module) => module.WrenFlight), {
  ssr: false,
});

/** Below this width the wren does not fly; it simply stands at each perch. */
const WIDE_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(WIDE_QUERY);
  list.addEventListener("change", onChange);
  return () => {
    list.removeEventListener("change", onChange);
  };
}

/** The flying wren, on wide screens, once motion is allowed and the page has settled. */
export function WrenFlightLayer() {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
  return wide ? (
    <MotionGate>
      <Flight />
    </MotionGate>
  ) : null;
}

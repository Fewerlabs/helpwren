"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { MotionGate } from "@/motion/gate";

const Flight = dynamic(() => import("./flight").then((module) => module.WrenFlight), {
  ssr: false,
});

/**
 * Below this width (phones) the wren does not fly the whole page; it hops onto each perch as its
 * entry comes into view (CSS). From here up it flies, routed round the words: through the page
 * margins on wide screens, through the gaps between blocks on narrower ones.
 */
const WIDE_QUERY = "(min-width: 1280px)";

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

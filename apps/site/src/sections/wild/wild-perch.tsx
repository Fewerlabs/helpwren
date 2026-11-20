"use client";

import { Perch } from "@/components/journal";
import { useChatOpens } from "@/components/live-widget";

/** Where the launcher is in the widget capture, in percent of the capture. */
const LAUNCHER = { x: 90, y: 91.2 } as const;

/** The wren on the widget's launcher. It hops each time the live chat is opened. */
export function WildPerch() {
  const opens = useChatOpens();
  return (
    <Perch
      name="wild"
      x={LAUNCHER.x}
      y={LAUNCHER.y}
      size={16}
      facing="left"
      react={opens === 0 ? undefined : opens}
    />
  );
}

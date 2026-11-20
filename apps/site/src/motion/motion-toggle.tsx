"use client";

import { setMotionPreference, useMotionPreference } from "./preference";

/**
 * The footer's animations switch, as a small text button that says what it does. It is
 * remembered in this browser. Off, the page is shown finished and still, as it is for people
 * whose device asks for reduced motion.
 */
export function MotionToggle() {
  const on = useMotionPreference();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setMotionPreference(!on);
      }}
      className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md text-sm transition-colors focus-visible:outline-2"
    >
      Animations: {on ? "on" : "off"}
    </button>
  );
}

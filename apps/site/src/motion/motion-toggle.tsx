"use client";

import { Label, Switch } from "@helpwren/design-system";
import { useId } from "react";

import { setMotionPreference, useMotionPreference } from "./preference";

/**
 * The footer's "Animations" switch. It is remembered in this browser. Off, the page is shown
 * finished and still, as it is for people whose device asks for reduced motion.
 */
export function MotionToggle() {
  const on = useMotionPreference();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={on}
        onCheckedChange={(checked) => {
          setMotionPreference(checked);
        }}
      />
      <Label htmlFor={id} className="text-muted-foreground text-sm font-normal">
        Animations
      </Label>
    </div>
  );
}

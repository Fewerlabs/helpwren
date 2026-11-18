import type { ComponentProps } from "react";

import { Switch as UiSwitch } from "#components/ui/switch";
import { cn } from "#lib/cn";

import { focusRing } from "../styles";

export type SwitchProps = Omit<ComponentProps<typeof UiSwitch>, "size">;

/** Turns a setting on or off with immediate effect. Always pair it with a label. */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <UiSwitch
      className={cn(
        // The pseudo-element extends the hit area to 44px tall.
        "data-unchecked:bg-input dark:data-unchecked:bg-input after:-inset-y-3.5",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

import type { ComponentProps } from "react";

import { Checkbox as UiCheckbox } from "#components/ui/checkbox";
import { cn } from "#lib/cn";

import { controlInvalid, controlSurface, focusRing } from "../styles";

export type CheckboxProps = ComponentProps<typeof UiCheckbox>;

/** A box for an independent yes or no choice. Always pair it with a label. */
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <UiCheckbox
      className={cn(
        // 20px box; the pseudo-element extends the hit area to 44px.
        "size-5 rounded-md after:-inset-3",
        controlSurface,
        focusRing,
        controlInvalid,
        className,
      )}
      {...props}
    />
  );
}

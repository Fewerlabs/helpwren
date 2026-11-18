import type { ComponentProps } from "react";

import { Input as UiInput } from "#components/ui/input";
import { cn } from "#lib/cn";

import { controlInvalid, controlSurface, focusRing } from "../styles";

export type InputProps = ComponentProps<"input">;

/** A single-line text input. Pair it with a label, most easily through `Field`. */
export function Input({ className, ...props }: InputProps) {
  return (
    <UiInput
      className={cn(
        "h-11 px-3 text-base md:text-sm",
        controlSurface,
        focusRing,
        controlInvalid,
        className,
      )}
      {...props}
    />
  );
}

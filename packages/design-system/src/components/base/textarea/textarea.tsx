import type { ComponentProps } from "react";

import { Textarea as UiTextarea } from "#components/ui/textarea";
import { cn } from "#lib/cn";

import { controlInvalid, controlSurface, focusRing } from "../styles";

export type TextareaProps = ComponentProps<"textarea">;

/** A multi-line text input that grows with its content. */
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <UiTextarea
      className={cn(
        "min-h-24 px-3 py-2.5 text-base md:text-sm",
        controlSurface,
        focusRing,
        controlInvalid,
        className,
      )}
      {...props}
    />
  );
}

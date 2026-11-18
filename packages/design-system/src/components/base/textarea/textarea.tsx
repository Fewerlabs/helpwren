"use client";

import type { ComponentProps } from "react";

import { Textarea as UiTextarea } from "#components/ui/textarea";
import { cn } from "#lib/cn";
import { useKeyboardFocus } from "#lib/keyboard-focus";

import { controlInvalid, controlSurface, textControlFocus } from "../styles";

export type TextareaProps = ComponentProps<"textarea">;

/** A multi-line text input that grows with its content. */
export function Textarea({ className, onFocus, onBlur, ...props }: TextareaProps) {
  const focus = useKeyboardFocus();

  return (
    <UiTextarea
      data-keyboard-focus={focus.keyboardFocus ? "" : undefined}
      className={cn(
        "min-h-24 px-3 py-2.5 text-base md:text-sm",
        controlSurface,
        controlInvalid,
        textControlFocus,
        className,
      )}
      onFocus={(event) => {
        onFocus?.(event);
        focus.onFocus(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        focus.onBlur();
      }}
      {...props}
    />
  );
}

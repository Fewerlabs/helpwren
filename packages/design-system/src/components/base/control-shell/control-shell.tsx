"use client";

import type { ComponentProps, MouseEvent } from "react";

import { cn } from "#lib/cn";
import { useKeyboardFocus } from "#lib/keyboard-focus";

import { controlShell } from "../styles";

const INTERACTIVE = "input, button, a, select, textarea, [role='button'], [role='option']";

function focusInput(event: MouseEvent<HTMLDivElement>) {
  if (event.target instanceof Element && event.target.closest(INTERACTIVE)) {
    return;
  }
  const input = event.currentTarget.querySelector("input:not([type='hidden'])");
  if (input instanceof HTMLInputElement && !input.disabled) {
    // Keep the click from moving focus to the body first.
    event.preventDefault();
    input.focus();
  }
}

/**
 * The outlined box shared by controls that wrap an input: Input with addons,
 * TagsInput and Combobox. Clicking its padding or an addon focuses the input.
 */
export function ControlShell({
  className,
  onMouseDown,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<"div">) {
  // Only the input counts: a chip's remove button has its own focus ring.
  const focus = useKeyboardFocus((target) => target instanceof HTMLInputElement);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a pointer convenience only: the input inside is the focusable, keyboard-operable control.
    <div
      data-keyboard-focus={focus.keyboardFocus ? "" : undefined}
      className={cn(controlShell, className)}
      onFocus={(event) => {
        onFocus?.(event);
        focus.onFocus(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        focus.onBlur();
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        if (!event.defaultPrevented) {
          focusInput(event);
        }
      }}
      {...props}
    />
  );
}

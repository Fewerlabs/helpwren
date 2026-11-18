import type { ComponentProps, MouseEvent } from "react";

import { cn } from "#lib/cn";

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
export function ControlShell({ className, onMouseDown, ...props }: ComponentProps<"div">) {
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a pointer convenience only: the input inside is the focusable, keyboard-operable control.
    <div
      className={cn(controlShell, className)}
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

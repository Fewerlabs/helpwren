/**
 * Class fragments shared by base components, so every control has the same
 * focus indicator, edge and error state.
 */

/**
 * A solid 2px outline in the accent colour, or in red pen when the control is invalid,
 * so the ring always matches the state of what it surrounds. Replaces shadcn's soft
 * ring, which is too faint on paper.
 */
export const focusRing =
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-invalid:focus-visible:outline-destructive";

/** The 1.5px edge and card surface of an outlined control, in both themes. */
export const controlSurface = "border-line border-input bg-card dark:bg-card";

/** The error state of a control marked `aria-invalid`. */
export const controlInvalid =
  "aria-invalid:border-destructive aria-invalid:ring-0 dark:aria-invalid:border-destructive";

/**
 * The outer box of a control that holds an input plus other content (addons, chips).
 * Focus, error and disabled states are read from the input inside it.
 */
export const controlShell = [
  // Height and text size can be lowered for a dense screen; see `compactControls` below.
  "flex min-h-(--hw-control-height,2.5rem) w-full min-w-0 items-center rounded-lg text-base transition-colors md:text-(length:--hw-control-text,0.875rem)",
  controlSurface,
  // Focus changes the edge to the accent colour. The ring is added only when focus
  // arrived from the keyboard (see ControlShell and lib/keyboard-focus).
  "has-[input:focus]:border-ring",
  "data-keyboard-focus:outline-ring data-keyboard-focus:outline-2 data-keyboard-focus:outline-offset-2 data-keyboard-focus:outline-solid",
  "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:data-keyboard-focus:outline-destructive",
  "has-[input:disabled]:bg-muted has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
].join(" ");

/**
 * The same behaviour for a control that is its own box, such as a textarea or a
 * select trigger: accent edge on focus, and a ring only for keyboard focus.
 */
export const textControlFocus = [
  "outline-none focus:border-ring focus-visible:ring-0",
  "data-keyboard-focus:outline-ring data-keyboard-focus:outline-2 data-keyboard-focus:outline-offset-2 data-keyboard-focus:outline-solid",
  "aria-invalid:focus:border-destructive aria-invalid:data-keyboard-focus:outline-destructive",
].join(" ");

/**
 * Put this on a container to make the text controls inside it smaller: 36px tall with 13px
 * text, in place of 40px and 14px. For dense screens such as a dashboard, where people use a
 * mouse and keyboard. Leave touch screens, such as the chat, at the default.
 */
export const compactControls =
  "[--hw-control-height:2.25rem] [--hw-control-text:0.8125rem] [--hw-control-pad:0.125rem]";

/** An input stripped of its own box, for use inside a `controlShell`. */
export const bareInput =
  "placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed";

/** Flips the caret of a select trigger while its list is open. */
export const caretFlip =
  "[&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 data-[state=open]:[&>svg:last-child]:rotate-180";

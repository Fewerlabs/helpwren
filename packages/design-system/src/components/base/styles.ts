/**
 * Class fragments shared by base components, so every control has the same
 * focus indicator, edge and error state.
 */

/** A solid 2px biro outline. Replaces shadcn's soft ring, which is too faint on paper. */
export const focusRing =
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid";

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
  "flex min-h-10 w-full min-w-0 items-center rounded-lg text-base transition-colors md:text-sm",
  controlSurface,
  "has-[input:focus-visible]:outline-ring has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-solid",
  "has-[input[aria-invalid=true]]:border-destructive",
  "has-[input:disabled]:bg-muted has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
].join(" ");

/** An input stripped of its own box, for use inside a `controlShell`. */
export const bareInput =
  "placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed";

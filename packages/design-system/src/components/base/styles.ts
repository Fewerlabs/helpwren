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

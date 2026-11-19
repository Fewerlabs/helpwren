import { cn } from "@helpwren/design-system";
import { type CSSProperties } from "react";

const dot = "color-mix(in srgb, var(--brand, var(--primary)) 55%, transparent)";
// Densest in the top corner, thinning out towards the middle and the foot. The two straight
// fades soften every side as well, so the pattern never stops at the edge of its box.
const fade = [
  "radial-gradient(85% 100% at 100% 0%, #000 0%, rgb(0 0 0 / 0.5) 35%, transparent 75%)",
  "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
  "linear-gradient(to bottom, #000 55%, transparent)",
].join(", ");

const halftone: CSSProperties = {
  backgroundImage: `radial-gradient(${dot} 1px, transparent 1.5px)`,
  backgroundSize: "7px 7px",
  maskImage: fade,
  WebkitMaskImage: fade,
  // Each layer hides more; only where all three show do the dots.
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

/**
 * A halftone of dots in the brand's colour behind the top of a public page, such as the chat
 * page and the help center, thinning out from the top corner with no edge. Its parent sets
 * where it sits; it stays behind the parent's content.
 */
export function PageHalftone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute -z-10", className)}
      style={halftone}
    />
  );
}

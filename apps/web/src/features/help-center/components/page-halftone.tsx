import { cn } from "@helpwren/design-system";
import { type CSSProperties } from "react";

const dot = "color-mix(in srgb, var(--brand, var(--primary)) 55%, transparent)";
// Densest in the top corner, thinning out with no edge towards the middle and the foot.
const fade = "radial-gradient(85% 100% at 100% 0%, #000 0%, rgb(0 0 0 / 0.5) 35%, transparent 75%)";

const halftone: CSSProperties = {
  backgroundImage: `radial-gradient(${dot} 1px, transparent 1.5px)`,
  backgroundSize: "7px 7px",
  maskImage: fade,
  WebkitMaskImage: fade,
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

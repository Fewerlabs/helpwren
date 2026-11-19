import { cn } from "@helpwren/design-system";
import { type CSSProperties } from "react";

const line = "color-mix(in srgb, var(--brand, var(--primary)) 12%, transparent)";
// Strongest at the top in the middle, gone well before the edges and the foot.
const fade = "radial-gradient(70% 100% at 50% 0%, #000 15%, transparent 75%)";

const grid: CSSProperties = {
  backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
  backgroundSize: "28px 28px",
  backgroundPosition: "center top",
  maskImage: fade,
  WebkitMaskImage: fade,
};

/**
 * Hairlines in the brand's colour behind the top of a public page, such as the chat page and the
 * help center, fading out with no edge. Its parent sets where it sits; it stays behind the
 * parent's content.
 */
export function PageGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute -z-10", className)}
      style={grid}
    />
  );
}

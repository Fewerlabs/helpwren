import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

export interface HighlightProps extends ComponentProps<"mark"> {
  /** `highlighter` swipes yellow behind the words; `pen` underlines them in red pen. */
  variant?: "highlighter" | "pen";
}

/**
 * Marks a word or a short phrase, as with a highlighter or a red pen. It sits
 * behind a word, never behind a paragraph, and belongs on the marketing site and
 * in the docs rather than in the product interface.
 */
export function Highlight({ variant = "highlighter", className, ...props }: HighlightProps) {
  return (
    <mark
      data-slot="highlight"
      data-variant={variant}
      className={cn(
        variant === "highlighter"
          ? "bg-highlighter text-highlighter-foreground rounded-sm box-decoration-clone px-1 py-0.5"
          : "decoration-pen bg-transparent text-inherit underline decoration-wavy decoration-2 underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}

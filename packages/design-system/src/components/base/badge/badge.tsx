import type { ComponentProps } from "react";

import { Badge as UiBadge } from "#components/ui/badge";
import { cn } from "#lib/cn";

const uiVariant = { neutral: "secondary", outline: "outline", accent: "default" } as const;

export interface BadgeProps extends Omit<ComponentProps<"span">, "color"> {
  variant?: keyof typeof uiVariant;
}

/**
 * A small label for a count, a tag or a category. For conversation and ticket
 * status use `StatusChip`, which carries the status colours and a dot.
 */
export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <UiBadge
      variant={uiVariant[variant]}
      data-variant={variant}
      className={cn("h-6 px-2.5", variant === "outline" && "border-line", className)}
      {...props}
    />
  );
}

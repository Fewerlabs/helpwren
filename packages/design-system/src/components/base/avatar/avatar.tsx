import type { ComponentProps } from "react";

import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
} from "#components/ui/avatar";
import { cn } from "#lib/cn";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  /** The person's or organisation's name. Used as the accessible name and for the initials. */
  name: string;
  /** An image URL. The initials are shown while it loads, and if it fails. */
  src?: string | undefined;
  size?: keyof typeof sizes;
}

/** Up to two initials: the first letters of the first and last words of the name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return [first, last]
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

/** A person or organisation, shown as their picture or their initials. */
export function Avatar({ name, src, size = "md", className, ...props }: AvatarProps) {
  return (
    <UiAvatar
      role="img"
      aria-label={name}
      // A card's surface and a hairline, like the cards and panels it sits among.
      className={cn(sizes[size], "after:border-rule", className)}
      {...props}
    >
      {src ? <UiAvatarImage src={src} alt="" /> : null}
      <UiAvatarFallback
        aria-hidden="true"
        className="bg-card text-muted-foreground text-[length:inherit] font-medium"
      >
        {initials(name)}
      </UiAvatarFallback>
    </UiAvatar>
  );
}

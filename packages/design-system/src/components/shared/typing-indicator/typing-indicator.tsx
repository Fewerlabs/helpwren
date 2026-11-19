import type { ComponentProps, ReactNode } from "react";

import { cn } from "#lib/cn";

/** "Ada is typing…", "Ada and Sam are typing…", or "Several people are typing…". */
export function typingLabel(names: readonly string[]): string {
  const [first, second] = names;
  if (first === undefined) return "";
  if (names.length === 1) return `${first} is typing…`;
  if (names.length === 2 && second !== undefined) return `${first} and ${second} are typing…`;
  return "Several people are typing…";
}

export interface TypingIndicatorProps extends Omit<ComponentProps<"div">, "children"> {
  /** Who is typing. Draws nothing when empty. */
  names: readonly string[];
  /** A face beside the dots, such as the writer's avatar. */
  avatar?: ReactNode;
  /** `sm` matches the inbox's compact messages, `md` the chat's. */
  size?: "sm" | "md";
}

/**
 * Someone on the other side writing now: three dots in a bubble where their message will
 * appear, and who it is in words. Screen readers hear the words once, politely. The dots hold
 * still for people who prefer reduced motion.
 */
export function TypingIndicator({
  names,
  avatar,
  size = "md",
  className,
  ...props
}: TypingIndicatorProps) {
  const label = typingLabel(names);
  return (
    <div
      role="status"
      data-slot="typing-indicator"
      className={cn("flex min-h-0 items-end gap-2", className)}
      {...props}
    >
      {label ? (
        <>
          {avatar}
          <div className="grid gap-1">
            <span
              aria-hidden="true"
              className={cn(
                "bg-muted flex w-fit items-center gap-1 rounded-2xl rounded-bl-md",
                size === "sm" ? "h-7 px-3" : "h-9 px-3.5",
              )}
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="bg-muted-foreground animate-typing size-1.5 rounded-full motion-reduce:animate-none motion-reduce:opacity-60"
                  style={{ animationDelay: `${dot * 150}ms` }}
                />
              ))}
            </span>
            <span className="text-muted-foreground text-2xs">{label}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

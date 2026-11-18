import { createElement, type ComponentProps, type ReactNode } from "react";

import { cn } from "#lib/cn";

import type { WrenScene } from "../../../illustrations/scenes";
import { Wren } from "../../../illustrations/wren";

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** One or two buttons or links that get the person moving again. */
  action?: ReactNode;
  /** Which wren scene to show, or `false` for none. Default `all-caught-up`. */
  scene?: WrenScene | false;
  /** Replaces the wren with your own illustration or icon. */
  illustration?: ReactNode;
  /** Draws the wren in when it appears. Default true. */
  animate?: boolean;
  size?: "sm" | "md";
  /** The level of the title's heading, to fit the page outline. Default 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/**
 * What to show where there would otherwise be nothing: an empty list, no search
 * results, a first run. The wren gives it character; the text says what is going
 * on and what to do next.
 */
export function EmptyState({
  title,
  description,
  action,
  scene = "all-caught-up",
  illustration,
  animate = true,
  size = "md",
  headingLevel = 2,
  className,
  ...props
}: EmptyStateProps) {
  const picture =
    illustration ??
    (scene === false ? null : (
      // The title says what the picture shows, so the picture is decorative.
      <Wren
        scene={scene}
        animate={animate}
        decorative
        className={size === "sm" ? "max-w-36" : "max-w-56"}
      />
    ));

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center text-center",
        size === "sm" ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
        className,
      )}
      {...props}
    >
      {picture}
      {createElement(
        `h${headingLevel}`,
        { className: cn("font-semibold", size === "sm" ? "text-sm" : "text-lg") },
        title,
      )}
      {description === undefined ? null : (
        <p className={cn("text-muted-foreground max-w-sm", size === "sm" ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {action === undefined ? null : (
        <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}

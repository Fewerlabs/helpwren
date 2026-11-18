import { createElement, type ComponentProps, type ReactNode } from "react";

import { cn } from "#lib/cn";

export interface PageHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  /** A short mono label above the title, such as `#open` or a section name. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons for the page's main actions. They sit to the right, or below on narrow screens. */
  actions?: ReactNode;
  /** The level of the title's heading. Default 1, for the top of a page. */
  headingLevel?: 1 | 2 | 3;
}

/** The top of a page or a major section: where you are, and what you can do here. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  headingLevel = 1,
  className,
  ...props
}: PageHeaderProps) {
  return (
    // Not a header element: a page can hold several of these, and only one banner landmark.
    <div
      data-slot="page-header"
      className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow === undefined ? null : (
          <p className="text-muted-foreground text-2xs font-mono tracking-wide uppercase">
            {eyebrow}
          </p>
        )}
        {createElement(
          `h${headingLevel}`,
          {
            className: cn(
              "font-semibold tracking-tight text-balance",
              headingLevel === 1 ? "text-2xl" : "text-xl",
            ),
          },
          title,
        )}
        {description === undefined ? null : (
          <p className="text-muted-foreground max-w-prose text-sm">{description}</p>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

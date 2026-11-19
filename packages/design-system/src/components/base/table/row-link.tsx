import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "#lib/cn";

import { focusRing } from "../styles";

export interface RowLinkProps extends ComponentProps<"button"> {
  /** Drawn before the name, such as an avatar. It is not underlined. */
  leading?: ReactNode;
  /** Drawn after the name on the same line, such as a badge or an icon. */
  trailing?: ReactNode;
  /** A quieter second line under the name. */
  description?: ReactNode;
  /**
   * Draws the child element instead of a button, for a link to the row's own page:
   * `<RowLink asChild><NextLink href="…">Title</NextLink></RowLink>`. The child's content is
   * the name.
   */
  asChild?: boolean;
}

interface ChildProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The name in a table's first column that opens its row, as a button or a link. The name is
 * underlined on hover and keyboard focus and the pointer becomes a hand, so it reads as
 * something to press. Every table uses it, so they all behave alike.
 */
export function RowLink({
  leading,
  trailing,
  description,
  asChild = false,
  className,
  children,
  ...props
}: RowLinkProps) {
  const classes = cn(
    "group flex w-fit max-w-full cursor-pointer items-center gap-2.5 rounded-md text-left font-medium",
    focusRing,
    className,
  );

  function content(name: ReactNode) {
    return (
      <>
        {leading}
        <span className="grid min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            {/* Only the name is underlined, not the avatar or badges beside it. */}
            <span className="decoration-muted-foreground/40 group-hover:decoration-foreground/70 truncate underline-offset-4 group-hover:underline group-focus-visible:underline">
              {name}
            </span>
            {trailing}
          </span>
          {/* An empty description, such as an article with no summary, leaves no blank line. */}
          {description === undefined || description === null || description === "" ? null : (
            <span className="text-muted-foreground truncate text-xs font-normal">
              {description}
            </span>
          )}
        </span>
      </>
    );
  }

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement<ChildProps>(child)) return null;
    // The link keeps its own props; the name inside it is laid out like the button's.
    return cloneElement(
      child as ReactElement<ChildProps & Record<string, unknown>>,
      { ...props, "data-slot": "row-link", className: cn(classes, child.props.className) },
      content(child.props.children),
    );
  }

  return (
    <button type="button" data-slot="row-link" className={classes} {...props}>
      {content(children)}
    </button>
  );
}

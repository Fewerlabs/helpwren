import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";
import { focusRing } from "../styles";

export interface LinkProps extends ComponentProps<"a"> {
  /** Opens in a new tab and says so, visually and to assistive technology. */
  external?: boolean;
  /** Renders the child element with the link's styles, for example a router link. */
  asChild?: boolean;
}

/**
 * A text link in biro blue. It is always underlined, so it never depends on colour
 * alone. Use `Button` for actions and `Link` for navigation.
 */
export function Link({
  external = false,
  asChild = false,
  className,
  children,
  ...props
}: LinkProps) {
  const Component = asChild ? Slot.Root : "a";
  const externalProps = external ? { target: "_blank", rel: "noreferrer noopener" } : {};

  return (
    <Component
      data-slot="link"
      className={cn(
        "text-biro hover:text-foreground rounded-sm underline underline-offset-4 transition-colors",
        focusRing,
        className,
      )}
      {...externalProps}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          {external ? (
            <>
              <Icon name="arrow-square-out" className="ml-1 inline-block align-[-0.125em]" />
              <span className="sr-only"> (opens in a new tab)</span>
            </>
          ) : null}
        </>
      )}
    </Component>
  );
}

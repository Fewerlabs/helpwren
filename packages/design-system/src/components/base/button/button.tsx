import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Button as UiButton } from "#components/ui/button";
import { cn } from "#lib/cn";

import { Spinner } from "../spinner/spinner";
import { focusRing } from "../styles";

const buttonVariants = cva(
  [
    "border-line relative gap-2 rounded-lg text-sm font-medium transition-colors",
    "disabled:opacity-50 aria-busy:cursor-progress",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent",
        secondary:
          "border-border bg-card text-foreground hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-muted",
        ghost: "text-foreground hover:bg-muted dark:hover:bg-muted border-transparent",
        destructive:
          "border-destructive bg-card text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive dark:bg-card dark:hover:bg-destructive/15",
        link: "text-biro hover:text-foreground h-auto border-transparent px-0 underline underline-offset-4",
      },
      size: {
        // 40px tall, with the hit area extended to 44px.
        md: "h-10 px-4 after:absolute after:-inset-x-0 after:-inset-y-0.5",
        // 32px tall, with the hit area extended to 44px.
        sm: "h-8 px-3 after:absolute after:-inset-x-0 after:-inset-y-1.5",
        icon: "size-10 after:absolute after:-inset-0.5 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-8 after:absolute after:-inset-1.5 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

const uiVariant = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  destructive: "outline",
  link: "link",
} as const;

type ButtonVariant = keyof typeof uiVariant;

interface CommonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  variant?: ButtonVariant;
  /** Shows a spinner, marks the button busy and prevents further clicks. */
  loading?: boolean;
  /** Renders the child element with the button's styles, for example a link. */
  asChild?: boolean;
}

interface TextButtonProps extends CommonProps {
  size?: "md" | "sm";
  "aria-label"?: string;
}

/** An icon-only button has no visible text, so it must be given a label. */
interface IconButtonProps extends CommonProps {
  size: "icon" | "icon-sm";
  "aria-label": string;
}

export type ButtonProps = TextButtonProps | IconButtonProps;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  className,
  children,
  type,
  ...props
}: ButtonProps) {
  const iconOnly = size === "icon" || size === "icon-sm";

  return (
    <UiButton
      variant={uiVariant[variant]}
      size={iconOnly ? "icon" : "default"}
      asChild={asChild}
      type={asChild ? type : (type ?? "button")}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Spinner />
          {iconOnly ? null : children}
        </>
      ) : (
        children
      )}
    </UiButton>
  );
}

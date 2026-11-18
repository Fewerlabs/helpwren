import type { ComponentProps } from "react";

import {
  Card as UiCard,
  CardAction as UiCardAction,
  CardContent as UiCardContent,
  CardDescription as UiCardDescription,
  CardFooter as UiCardFooter,
  CardHeader as UiCardHeader,
  CardTitle as UiCardTitle,
} from "#components/ui/card";
import { cn } from "#lib/cn";

export type CardProps = Omit<ComponentProps<typeof UiCard>, "size">;

/** An outlined surface that groups related content. */
export function Card({ className, ...props }: CardProps) {
  return (
    <UiCard
      className={cn(
        "border-line border-border rounded-2xl ring-0 [--card-spacing:--spacing(5)]",
        className,
      )}
      {...props}
    />
  );
}

export const CardHeader = UiCardHeader;
export const CardAction = UiCardAction;
export const CardContent = UiCardContent;
export const CardDescription = UiCardDescription;

export function CardTitle({ className, ...props }: ComponentProps<typeof UiCardTitle>) {
  return <UiCardTitle className={cn("font-semibold", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<typeof UiCardFooter>) {
  return <UiCardFooter className={cn("border-rule rounded-b-2xl", className)} {...props} />;
}

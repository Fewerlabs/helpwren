import type { ComponentProps, ReactElement, ReactNode } from "react";

import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
  TooltipTrigger as UiTooltipTrigger,
} from "#components/ui/tooltip";
import { cn } from "#lib/cn";

type ContentProps = ComponentProps<typeof UiTooltipContent>;

export interface TooltipProps extends Omit<ComponentProps<typeof UiTooltip>, "children"> {
  /** The short text to show. It must not be the only place the information lives. */
  content: ReactNode;
  side?: ContentProps["side"];
  /** The element the tooltip describes. It must be focusable, such as a `Button`. */
  children: ReactElement;
  className?: string;
}

/** Place one near the root of the app. Every `Tooltip` must be inside it. */
export function TooltipProvider({
  delayDuration = 300,
  ...props
}: ComponentProps<typeof UiTooltipProvider>) {
  return <UiTooltipProvider delayDuration={delayDuration} {...props} />;
}

/** A short hint shown when its child is hovered or focused. */
export function Tooltip({ content, side = "top", className, children, ...props }: TooltipProps) {
  return (
    <UiTooltip {...props}>
      <UiTooltipTrigger asChild>{children}</UiTooltipTrigger>
      <UiTooltipContent side={side} sideOffset={6} className={cn("rounded-lg", className)}>
        {content}
      </UiTooltipContent>
    </UiTooltip>
  );
}

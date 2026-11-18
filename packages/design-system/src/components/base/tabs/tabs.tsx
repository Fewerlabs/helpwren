import type { ComponentProps } from "react";

import {
  Tabs as UiTabs,
  TabsContent as UiTabsContent,
  TabsList as UiTabsList,
  TabsTrigger as UiTabsTrigger,
} from "#components/ui/tabs";
import { cn } from "#lib/cn";

import { focusRing } from "../styles";

export type TabsProps = ComponentProps<typeof UiTabs>;
export type TabsListProps = Omit<ComponentProps<typeof UiTabsList>, "variant">;
export type TabsTriggerProps = ComponentProps<typeof UiTabsTrigger>;
export type TabsContentProps = ComponentProps<typeof UiTabsContent>;

/** Switches between views of the same context without leaving the page. */
export const Tabs = UiTabs;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <UiTabsList className={cn("gap-1 p-1 group-data-horizontal/tabs:h-10", className)} {...props} />
  );
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <UiTabsTrigger
      className={cn(
        "text-muted-foreground dark:text-muted-foreground h-full px-3",
        "data-active:bg-card data-active:text-foreground dark:data-active:bg-card dark:data-active:border-transparent",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <UiTabsContent className={cn("rounded-sm", focusRing, className)} {...props} />;
}

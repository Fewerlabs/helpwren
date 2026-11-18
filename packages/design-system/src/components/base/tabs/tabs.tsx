"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";

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

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const ACTIVE = "[role='tab'][data-state='active']";

function measure(list: HTMLElement): Box | null {
  const active = list.querySelector<HTMLElement>(ACTIVE);
  return active
    ? {
        left: active.offsetLeft,
        top: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
      }
    : null;
}

function sameBox(first: Box | null, second: Box | null): boolean {
  return (
    first?.left === second?.left &&
    first?.top === second?.top &&
    first?.width === second?.width &&
    first?.height === second?.height
  );
}

/** Brings the active tab to the middle of a list that scrolls. */
function centre(list: HTMLElement, smooth: boolean) {
  const active = list.querySelector<HTMLElement>(ACTIVE);
  if (!active || list.scrollWidth <= list.clientWidth) {
    return;
  }
  list.scrollTo({
    left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2,
    behavior: smooth ? "smooth" : "auto",
  });
}

/**
 * The row of tabs. One indicator sits behind the active tab and slides to the next
 * one when the selection changes. If the tabs do not fit, the row scrolls sideways
 * and the chosen tab is brought to the centre.
 */
export function TabsList({ className, children, ...props }: TabsListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  // The first placement must not animate in from the corner.
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return undefined;
    }
    const update = () => {
      setBox((previous) => {
        const next = measure(list);
        return sameBox(previous, next) ? previous : next;
      });
    };
    update();
    centre(list, false);

    // The active tab is marked by Radix with data-state, which changes on selection.
    const selection = new MutationObserver(() => {
      update();
      centre(list, true);
    });
    selection.observe(list, { attributes: true, attributeFilter: ["data-state"], subtree: true });

    const resize = new ResizeObserver(update);
    resize.observe(list);
    for (const tab of list.querySelectorAll("[role='tab']")) {
      resize.observe(tab);
    }
    return () => {
      selection.disconnect();
      resize.disconnect();
    };
  }, []);

  useEffect(() => {
    if (box && !placed) {
      const frame = requestAnimationFrame(() => {
        setPlaced(true);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    return undefined;
  }, [box, placed]);

  return (
    <UiTabsList
      ref={listRef}
      className={cn(
        "relative max-w-full justify-start gap-1 overflow-x-auto p-1 group-data-horizontal/tabs:h-10",
        // The row scrolls by touch, wheel and keyboard; a scrollbar inside it would only add noise.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      {box ? (
        <span
          aria-hidden="true"
          data-slot="tabs-indicator"
          className={cn(
            "bg-card pointer-events-none absolute top-0 left-0 rounded-md",
            placed && "transition-[translate,width,height] duration-200 ease-out",
          )}
          style={{
            translate: `${box.left}px ${box.top}px`,
            width: box.width,
            height: box.height,
          }}
        />
      ) : null}
      {children}
    </UiTabsList>
  );
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <UiTabsTrigger
      className={cn(
        "text-muted-foreground dark:text-muted-foreground z-10 h-full shrink-0 px-3",
        // The sliding indicator is the active background, so the tab itself stays clear.
        "data-active:text-foreground dark:data-active:text-foreground data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent",
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

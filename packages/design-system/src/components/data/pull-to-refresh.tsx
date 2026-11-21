"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../base/icon/icon";
import { Spinner } from "../base/spinner/spinner";

/** How far the list has to be pulled, in pixels, before letting go refreshes it. */
const THRESHOLD = 64;
/** The furthest the list moves however far the finger goes. */
const MAX = 96;
/** Where the list rests while it refreshes. */
const REST = 48;

export interface PullToRefreshOptions {
  /** Off, the list scrolls as usual. Only a touch screen ever pulls. */
  enabled: boolean;
  /** Called once the list is pulled far enough and let go. */
  onRefresh: () => void;
  /** True while the refresh runs: the spinner stays until it turns false. */
  busy: boolean;
}

export interface PullToRefreshState {
  /** Put on the element that scrolls. */
  ref: (element: HTMLElement | null) => void;
  /** How far the content is pulled down, in pixels. */
  distance: number;
  /** True while a finger is pulling, so the content follows it without easing. */
  dragging: boolean;
  refreshing: boolean;
}

/**
 * Pull down at the top of a list to refresh it, as in a phone's own apps. An installed web app
 * has no browser around it to do this, and the dashboard scrolls inside its panels rather than
 * the page, so a browser's own pull never reaches the list either.
 */
export function usePullToRefresh({
  enabled,
  onRefresh,
  busy,
}: PullToRefreshOptions): PullToRefreshState {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const sawBusy = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  // The spinner stays while the list loads. A list that answers before it was ever seen busy
  // still shows the spinner for a moment, so the pull visibly did something.
  useEffect(() => {
    if (!refreshing) return undefined;
    const finish = () => {
      refreshingRef.current = false;
      setRefreshing(false);
      setDistance(0);
    };
    if (busy) {
      sawBusy.current = true;
      return undefined;
    }
    if (sawBusy.current) {
      finish();
      return undefined;
    }
    const timer = setTimeout(finish, 600);
    return () => {
      clearTimeout(timer);
    };
  }, [refreshing, busy]);

  useEffect(() => {
    if (!enabled || !element || !window.matchMedia("(pointer: coarse)").matches) {
      return undefined;
    }
    let startY: number | null = null;
    let pulled = 0;

    const start = (event: TouchEvent) => {
      const touch = event.touches[0];
      startY =
        touch && event.touches.length === 1 && element.scrollTop <= 0 && !refreshingRef.current
          ? touch.clientY
          : null;
      pulled = 0;
    };
    const move = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (startY === null || !touch) return;
      const down = touch.clientY - startY;
      if (down <= 0 || element.scrollTop > 0) {
        // Scrolling up into the list, not pulling.
        if (pulled > 0) {
          pulled = 0;
          setDistance(0);
          setDragging(false);
        }
        startY = down <= 0 ? touch.clientY : startY;
        return;
      }
      // Held here, so the list does not bounce on its own as well.
      event.preventDefault();
      // Half the finger's travel, so the list feels as if it resists.
      pulled = Math.min(MAX, down * 0.5);
      setDragging(true);
      setDistance(pulled);
    };
    const end = () => {
      if (startY === null) return;
      startY = null;
      setDragging(false);
      if (pulled >= THRESHOLD) {
        refreshingRef.current = true;
        sawBusy.current = false;
        setRefreshing(true);
        setDistance(REST);
        onRefreshRef.current();
      } else {
        setDistance(0);
      }
      pulled = 0;
    };

    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    return () => {
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
    };
  }, [enabled, element]);

  return { ref: setElement, distance, dragging, refreshing };
}

/** Moves the content down with the pull. Spread onto the box inside the one that scrolls. */
export function pullStyle({ distance, dragging }: PullToRefreshState): CSSProperties | undefined {
  if (distance === 0 && !dragging) return undefined;
  return {
    transform: `translateY(${distance}px)`,
    transition: dragging ? "none" : "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };
}

/**
 * The arrow that appears above a list as it is pulled, turning to point up once letting go
 * would refresh, then a spinner while it does.
 */
export function PullIndicator({
  state,
  label = "Refreshing",
}: {
  state: PullToRefreshState;
  label?: string;
}) {
  const { distance, dragging, refreshing } = state;
  if (distance === 0 && !refreshing) return null;
  const ready = distance >= THRESHOLD;
  return (
    <div
      data-slot="pull-indicator"
      aria-hidden={!refreshing}
      className="pointer-events-none sticky top-0 z-10 h-0"
    >
      <div
        className="absolute inset-x-0 top-0 flex justify-center"
        style={{
          transform: `translateY(${Math.max(0, distance - 40)}px)`,
          opacity: refreshing ? 1 : Math.min(1, distance / THRESHOLD),
          transition: dragging ? "none" : "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <span className="bg-card border-rule text-muted-foreground grid size-8 place-items-center rounded-full border shadow-sm">
          {refreshing ? (
            <Spinner label={label} className="size-4" />
          ) : (
            <Icon
              name="arrow-down"
              className={cn(
                "size-4 transition-transform duration-200",
                ready && "text-primary rotate-180",
              )}
            />
          )}
        </span>
      </div>
    </div>
  );
}

"use client";

import type { CodeSnippetProps, ThemeMenuProps } from "@helpwren/design-system";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useIdle } from "@/motion/preference";

/*
 * Interactive pieces that are not needed for the first paint. The server renders a still
 * stand-in of the same size; the real component's code (Radix, the icon set) is fetched only
 * when it is wanted: the theme menu when a pointer or the keyboard reaches it, the snippet when
 * its entry nears the screen. A page that is only read never downloads the icon set.
 */

const ThemeMenu = lazy(() =>
  import("./islands/theme-menu").then((module) => ({ default: module.ThemeMenu })),
);
const CodeSnippet = lazy(() =>
  import("./islands/code-snippet").then((module) => ({ default: module.CodeSnippet })),
);
const OpenChatButton = lazy(() =>
  import("./open-chat-button").then((module) => ({ default: module.OpenChatButton })),
);
const MotionToggle = lazy(() =>
  import("@/motion/motion-toggle").then((module) => ({ default: module.MotionToggle })),
);

/** Calls back once its children have mounted: the real component, not the stand-in. */
function Mounted({ onMount, children }: { onMount: () => void; children: ReactNode }) {
  useEffect(onMount, [onMount]);
  return children;
}

/**
 * Loads the real component when the stand-in is pointed at, focused or pressed. A press made
 * before the code arrived is passed on to the real button once it is there, so it is not lost.
 */
function OnIntent({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const [wanted, setWanted] = useState(false);
  const pressed = useRef(false);
  const live = useRef(false);
  const box = useRef<HTMLSpanElement>(null);
  const want = () => {
    setWanted(true);
  };
  const replay = useCallback(() => {
    live.current = true;
    if (!pressed.current) return;
    pressed.current = false;
    const button = box.current?.querySelector<HTMLElement>("button");
    button?.focus();
    button?.click();
  }, []);
  return (
    // Listens to the events that bubble up from the button inside it; it is not a control itself.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see the line above
    <span
      ref={box}
      className="contents"
      onPointerEnter={want}
      onFocus={want}
      onTouchStart={want}
      onClickCapture={(event) => {
        if (live.current) return;
        pressed.current = true;
        event.preventDefault();
        want();
      }}
    >
      {wanted ? (
        <Suspense fallback={fallback}>
          <Mounted onMount={replay}>{children}</Mounted>
        </Suspense>
      ) : (
        fallback
      )}
    </span>
  );
}

/** Loads the real component when its stand-in comes within a screen of view. */
function NearView({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const [near, setNear] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The wrapper has no box of its own (display: contents), so watch the stand-in inside it.
    const element = box.current?.firstElementChild;
    if (!element || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [near]);
  return (
    <div ref={box} className="contents">
      {near ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
}

function OnIdle({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return useIdle() ? <Suspense fallback={fallback}>{children}</Suspense> : fallback;
}

export function DeferredThemeMenu({
  fallback,
  ...props
}: ThemeMenuProps & { fallback: ReactNode }) {
  return (
    <OnIntent fallback={fallback}>
      <ThemeMenu {...props} />
    </OnIntent>
  );
}

export function DeferredCodeSnippet({
  fallback,
  ...props
}: CodeSnippetProps & { fallback: ReactNode }) {
  return (
    <NearView fallback={fallback}>
      <CodeSnippet {...props} />
    </NearView>
  );
}

/** The footer's animations switch: a small switch with no icons, so it simply loads when idle. */
export function DeferredMotionToggle({ fallback }: { fallback: ReactNode }) {
  return (
    <OnIdle fallback={fallback}>
      <MotionToggle />
    </OnIdle>
  );
}

/**
 * The button that opens the live chat. Its code is fetched only when a page renders it (when a
 * demo install is set). The icon is drawn by the server and passed in, so the icon set stays out.
 */
export function LazyOpenChatButton({ icon }: { icon: ReactNode }) {
  return (
    <Suspense fallback={<span className="block h-10" />}>
      <OpenChatButton icon={icon} />
    </Suspense>
  );
}

"use client";

import type { CodeSnippetProps, ThemeMenuProps } from "@helpwren/design-system";
import { lazy, Suspense, type ReactNode } from "react";

import { useIdle } from "@/motion/preference";

/*
 * Interactive pieces that are not needed for the first paint. The server renders a still
 * stand-in of the same size; once the browser is idle the real component's code is fetched and
 * takes its place. This keeps their JavaScript (Radix, the icon set, toasts) out of the page's
 * first download, which is what decides how fast the page shows.
 */

const ThemeMenu = lazy(() =>
  import("./islands/theme-menu").then((module) => ({ default: module.ThemeMenu })),
);
const CodeSnippet = lazy(() =>
  import("./islands/code-snippet").then((module) => ({ default: module.CodeSnippet })),
);
const MotionToggle = lazy(() =>
  import("@/motion/motion-toggle").then((module) => ({ default: module.MotionToggle })),
);

function Deferred({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return useIdle() ? <Suspense fallback={fallback}>{children}</Suspense> : fallback;
}

export function DeferredThemeMenu({
  fallback,
  ...props
}: ThemeMenuProps & { fallback: ReactNode }) {
  return (
    <Deferred fallback={fallback}>
      <ThemeMenu {...props} />
    </Deferred>
  );
}

export function DeferredCodeSnippet({
  fallback,
  ...props
}: CodeSnippetProps & { fallback: ReactNode }) {
  return (
    <Deferred fallback={fallback}>
      <CodeSnippet {...props} />
    </Deferred>
  );
}

export function DeferredMotionToggle({ fallback }: { fallback: ReactNode }) {
  return (
    <Deferred fallback={fallback}>
      <MotionToggle />
    </Deferred>
  );
}

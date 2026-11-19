"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";

/** How far the bar creeps on its own while the next page loads, so it never looks finished. */
const CREEP_LIMIT = 0.9;
/** A page that never arrives still lets the bar go, rather than leaving it stuck on screen. */
const GIVE_UP_MS = 15_000;

/**
 * How far the bar has gone, from 0 to 1, or `null` while no page is loading. Kept outside React
 * because it runs on timers, and every bar on screen shows the same load.
 */
let progress: number | null = null;
const listeners = new Set<() => void>();
let creep: ReturnType<typeof setInterval> | undefined;
let giveUp: ReturnType<typeof setTimeout> | undefined;
let hide: ReturnType<typeof setTimeout> | undefined;

function set(next: number | null) {
  progress = next;
  for (const listener of listeners) listener();
}

function clearTimers() {
  clearInterval(creep);
  clearTimeout(giveUp);
  clearTimeout(hide);
}

function finish() {
  if (progress === null) return;
  clearTimers();
  set(1);
  hide = setTimeout(() => {
    set(null);
  }, 300);
}

function start() {
  clearTimers();
  set(0.12);
  creep = setInterval(() => {
    // Each step covers part of what is left, so it slows as it nears the limit.
    if (progress !== null) set(progress + (CREEP_LIMIT - progress) * 0.1);
  }, 200);
  giveUp = setTimeout(finish, GIVE_UP_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether a click on this link takes the browser to another page of this site. */
function leadsToAnotherPage(event: MouseEvent): boolean {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = (event.target as Element | null)?.closest("a");
  if (!link || link.hasAttribute("download")) return false;
  if (link.target && link.target !== "_self") return false;
  const to = new URL(link.href, window.location.href);
  if (to.origin !== window.location.origin) return false;
  // A jump within the same page, such as to a heading, is not a page load.
  return to.pathname !== window.location.pathname || to.search !== window.location.search;
}

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const shown = useSyncExternalStore(
    subscribe,
    () => progress,
    () => null,
  );

  // A link to another page, or the browser's back and forward buttons, start the bar.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (leadsToAnotherPage(event)) start();
    };
    // Heard on the way down, before Next.js's links cancel the browser's own navigation to do
    // it themselves, which would hide the click from a listener on the way back up.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
    };
  }, []);

  // The new page has arrived when the address changes.
  useEffect(() => {
    finish();
  }, [pathname, search]);

  if (shown === null) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading the page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className="bg-primary h-full origin-left transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${shown})`, opacity: shown === 1 ? 0 : 1 }}
      />
    </div>
  );
}

/**
 * A thin bar across the top of the window while the next page loads, after a link is followed
 * or the browser goes back or forward. Pages of this app load from the server, so without it a
 * click can seem to do nothing for a moment.
 */
export function RouteProgress() {
  // Reading the address's search part needs a boundary, so pages built ahead of time still can be.
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

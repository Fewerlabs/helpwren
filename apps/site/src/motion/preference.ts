"use client";

import { useSyncExternalStore } from "react";

import { MOTION_STORAGE_KEY } from "./script";

/*
 * Whether the page may move. Two things decide: the device's reduced-motion setting, and the
 * "Animations" switch in the footer. Nothing here imports GSAP; the motion layer itself is only
 * fetched once this says yes and the browser is idle.
 */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
/** The longest the motion layer waits for the browser to be idle before loading anyway. */
const IDLE_TIMEOUT_MS = 2000;
/** How long after the page has loaded before anything deferred starts loading. */
const SETTLE_MS = 300;

const listeners = new Set<() => void>();
let idle = false;

function notify() {
  for (const listener of listeners) listener();
}

function storedOff(): boolean {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function allowed(): boolean {
  return !window.matchMedia(REDUCED_QUERY).matches && !storedOff();
}

let waiting = false;

/**
 * Settled means: the page has loaded, a moment has passed for the first paint to finish, and the
 * browser has a free moment. Nothing loaded after this competes with what the visitor first sees.
 */
function waitForIdle() {
  if (idle || waiting) return;
  waiting = true;
  const done = () => {
    idle = true;
    notify();
  };
  const afterLoad = () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(done, { timeout: IDLE_TIMEOUT_MS });
      } else {
        done();
      }
    }, SETTLE_MS);
  };
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.matchMedia(REDUCED_QUERY).addEventListener("change", notify);
    waitForIdle();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0)
      window.matchMedia(REDUCED_QUERY).removeEventListener("change", notify);
  };
}

/** Whether the person allows motion: no reduced-motion setting, and the footer switch on. */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(subscribe, allowed, () => false);
}

/** True once motion is allowed and the page has settled, so the motion layer may load. */
export function useMotionReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => idle && allowed(),
    () => false,
  );
}

/** True once the page has settled, for loading things the first paint does not need. */
export function useIdle(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => idle,
    () => false,
  );
}

/** The words the reader is looking at: the first heading, paragraph or figure on screen. */
function inView(): Element | null {
  const marks = document.querySelectorAll("main h1, main h2, main h3, main p, main figure");
  let fallback: Element | null = null;
  for (const mark of marks) {
    const box = mark.getBoundingClientRect();
    if (box.bottom <= 0 || box.height === 0) continue;
    if (box.top >= window.innerHeight) break;
    // Words in the pinned entry move with the pin, so they make a poor anchor; use them only
    // when nothing else is on screen.
    if (mark.closest("[data-pin]")) {
      fallback ??= mark.closest("[data-pin]");
      continue;
    }
    return mark;
  }
  return fallback;
}

/**
 * Turns animations on or off for this browser, and tells everything listening. The pinned entry
 * takes more or less room with animations on, so the page is held on the words in view: they
 * stay where they were on screen.
 */
export function setMotionPreference(on: boolean) {
  const anchor = inView();
  const before = anchor?.getBoundingClientRect().top ?? 0;
  const hold = () => {
    if (!anchor) return;
    const moved = anchor.getBoundingClientRect().top - before;
    if (Math.abs(moved) >= 1) window.scrollTo({ top: window.scrollY + moved, behavior: "instant" });
  };
  try {
    if (on) window.localStorage.removeItem(MOTION_STORAGE_KEY);
    else window.localStorage.setItem(MOTION_STORAGE_KEY, "off");
  } catch {
    // Storage is blocked: the choice lasts until the page is left.
  }
  document.documentElement.dataset.motionPref = on ? "on" : "off";
  hold();
  notify();
  // Once the motion layer has started or stopped (smooth scrolling, the pin), hold it again.
  for (const wait of [50, 300, 800]) window.setTimeout(hold, wait);
}

/** Whether the footer switch is on, whatever the device says. */
export function useMotionPreference(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !storedOff(),
    () => true,
  );
}

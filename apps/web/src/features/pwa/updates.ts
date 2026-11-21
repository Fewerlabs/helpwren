"use client";

import { useSyncExternalStore } from "react";

import { buildInfo } from "@/lib/build-info";

import { healthVersionSchema, isNewVersion, workerUrl, workerVersion } from "./version";

/** The service worker's reach: the dashboard, and nothing else on the site. */
export const WORKER_SCOPE = "/dashboard";

const development = process.env.NODE_ENV === "development";

let registration: ServiceWorkerRegistration | null = null;
let updateReady = false;
const listeners = new Set<() => void>();

function setUpdateReady() {
  if (updateReady) return;
  updateReady = true;
  for (const listener of listeners) listener();
}

function supported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Looks at a worker that has finished installing. With a page already controlled, it is a new
 * version waiting for the go-ahead. One for the build this page already runs is the page
 * catching up (it was loaded after a deploy), so it takes over quietly.
 */
function consider(worker: ServiceWorker) {
  if (!navigator.serviceWorker.controller) return;
  if (workerVersion(worker.scriptURL) === buildInfo.version) {
    worker.postMessage({ type: "SKIP_WAITING" });
    return;
  }
  setUpdateReady();
}

function watch(watched: ServiceWorkerRegistration) {
  if (watched.waiting) consider(watched.waiting);
  watched.addEventListener("updatefound", () => {
    const worker = watched.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed") consider(worker);
    });
  });
}

/** Registers the dashboard's service worker for this build. Safe to call more than once. */
export async function registerServiceWorker(): Promise<void> {
  if (!supported() || registration) return;
  registration = await navigator.serviceWorker.register(workerUrl(buildInfo.version, development), {
    scope: WORKER_SCOPE,
  });
  watch(registration);
}

/**
 * Asks the server which build it runs. A different one means a new deploy: its service worker
 * is installed, and the page offers to update. Also asks the browser to look for a new worker.
 */
export async function checkForUpdate(): Promise<"current" | "ready"> {
  const response = await fetch("/api/health", { cache: "no-store" });
  const health = healthVersionSchema.safeParse(await response.json().catch(() => null));
  const reported = health.success ? health.data.version : undefined;

  if (reported !== undefined && isNewVersion(buildInfo.version, reported)) {
    if (supported() && registration) {
      // Installs the new build's worker, which then waits, as `consider` expects.
      await navigator.serviceWorker
        .register(workerUrl(reported, development), { scope: WORKER_SCOPE })
        .catch(() => undefined);
    }
    setUpdateReady();
  } else {
    await registration?.update().catch(() => undefined);
  }
  return updateReady ? "ready" : "current";
}

/**
 * Moves to the new version: the waiting worker takes over, and the page reloads once it has.
 * Without one (no service worker, or it is still installing), a reload is the update.
 */
export function applyUpdate() {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      window.location.reload();
    },
    { once: true },
  );
  waiting.postMessage({ type: "SKIP_WAITING" });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether a new version is ready, current as it changes. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => updateReady,
    () => false,
  );
}

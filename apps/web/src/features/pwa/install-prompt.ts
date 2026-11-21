"use client";

import { useSyncExternalStore } from "react";

import { isStandalone } from "./platform";

/** Chromium's offer to install the app. Not in TypeScript's DOM types, being Chromium's own. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  /** The browser's offer, kept until it is used: it can be shown once. */
  offer: BeforeInstallPromptEvent | null;
  /** Installed while this page was open, or opened as the installed app. */
  installed: boolean;
}

let state: InstallState = { offer: null, installed: false };
const listeners = new Set<() => void>();

function set(next: Partial<InstallState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

// Listened for as soon as this module loads, because the browser may offer before React has
// drawn anything, and it offers only once per page.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Kept for the banner or the menu to show when the person asks, not shown straight away.
    event.preventDefault();
    set({ offer: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => {
    set({ offer: null, installed: true });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverState: InstallState = { offer: null, installed: false };

export interface InstallPrompt {
  /** The browser can show its install dialog now. */
  canPrompt: boolean;
  /** Running as the installed app, or installed from this page. */
  installed: boolean;
  /** Shows the browser's install dialog. True when the person installed. */
  install: () => Promise<boolean>;
}

async function install(): Promise<boolean> {
  const { offer } = state;
  if (!offer) return false;
  set({ offer: null });
  await offer.prompt();
  const { outcome } = await offer.userChoice;
  return outcome === "accepted";
}

/** The browser's offer to install the dashboard, where there is one. */
export function useInstallPrompt(): InstallPrompt {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => false);
  return {
    canPrompt: current.offer !== null,
    installed: current.installed || standalone,
    install,
  };
}

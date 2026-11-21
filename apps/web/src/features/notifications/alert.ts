import { useSyncExternalStore } from "react";

import { WORKER_SCOPE } from "@/features/pwa";

/** Whether this browser can show notifications at all. */
function desktopSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

const never = () => () => undefined;

/** The same, for rendering. Assumed on the server, where there is no browser to ask. */
export function useDesktopSupported(): boolean {
  return useSyncExternalStore(never, desktopSupported, () => true);
}

/** Asks the browser for permission to notify, if it has not been asked. True when it is given. */
export async function requestDesktopPermission(): Promise<boolean> {
  if (!desktopSupported()) return false;
  if (Notification.permission === "granted") return true;
  // Already refused, this answers at once without asking again.
  return (await Notification.requestPermission()) === "granted";
}

export interface DesktopAlert {
  title: string;
  body: string;
  /** Replaces an earlier notification with the same tag, so one conversation shows once. */
  tag: string;
  /** A dashboard address to open when it is clicked. */
  url?: string;
  /** Run when it is clicked, as well, where the page shows it itself. */
  onOpen?: () => void;
}

/**
 * Shows a notification from the browser. Does nothing without permission.
 *
 * Through the dashboard's service worker when it has one: the only way a phone shows one, and
 * the same kind of notification a push shows, so for one conversation the two replace each
 * other. A click then opens `url` through the worker.
 */
export async function showDesktopAlert({ title, body, tag, url, onOpen }: DesktopAlert) {
  if (!desktopSupported() || Notification.permission !== "granted") return;
  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration(WORKER_SCOPE).catch(() => undefined)
      : undefined;
  if (registration?.active) {
    await registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
      data: { url: url ?? "/dashboard/inbox" },
    });
    return;
  }
  const notification = new Notification(title, { body, tag });
  notification.onclick = () => {
    window.focus();
    onOpen?.();
    notification.close();
  };
}

let audio: AudioContext | undefined;

/** The one audio context the dashboard plays through, made the first time it is needed. */
function audioContext(): AudioContext | undefined {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return undefined;
  audio ??= new AudioContext();
  return audio;
}

/**
 * Lets the dashboard play sounds later. iOS keeps a page's audio muted until it is started
 * from a tap or a key press, and a new message arrives with neither: so the first tap anywhere
 * starts the one context the sound plays through, and it stays started. Run once, as the
 * dashboard opens.
 */
export function unlockSoundOnFirstTouch(): () => void {
  const events = ["pointerdown", "touchend", "keydown"] as const;
  const unlock = () => {
    const context = audioContext();
    if (!context) return;
    void context.resume().then(() => {
      if (context.state !== "running") return;
      // A moment of silence, which is what finally lets iOS play through it.
      const buffer = context.createBuffer(1, 1, 22_050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
      for (const event of events) window.removeEventListener(event, unlock, true);
    });
  };
  for (const event of events) window.addEventListener(event, unlock, true);
  return () => {
    for (const event of events) window.removeEventListener(event, unlock, true);
  };
}

/** Two short rising notes, made here so there is no sound file to ship. */
export function playSound() {
  const context = audioContext();
  if (!context) return;
  // Suspended again by the system, as iOS does after a call or with the app in the background.
  if (context.state !== "running") void context.resume();
  const now = context.currentTime;
  [660, 880].forEach((frequency, index) => {
    const start = now + index * 0.12;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.24);
  });
}

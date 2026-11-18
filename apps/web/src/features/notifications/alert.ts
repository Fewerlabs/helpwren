import { useSyncExternalStore } from "react";

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
  onOpen?: () => void;
}

/** Shows a notification from the browser. Does nothing without permission. */
export function showDesktopAlert({ title, body, tag, onOpen }: DesktopAlert) {
  if (!desktopSupported() || Notification.permission !== "granted") return;
  const notification = new Notification(title, { body, tag });
  notification.onclick = () => {
    window.focus();
    onOpen?.();
    notification.close();
  };
}

/** Two short rising notes, made here so there is no sound file to ship. */
export function playSound() {
  const context = new AudioContext();
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
  window.setTimeout(() => {
    void context.close();
  }, 600);
}

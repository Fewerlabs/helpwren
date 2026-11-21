import { useSyncExternalStore } from "react";
import { z } from "zod";

import { notifyAboutSchema } from "./push-schema";

/**
 * How one team member wants to hear about new messages. Kept in this browser and not on the
 * server, because permission to show a notification is the browser's to give, one device at a
 * time.
 */
export const preferencesSchema = z.object({
  /** Show a notification from the browser when a message arrives while the tab is not in view. */
  desktop: z.boolean().default(false),
  /** Play a short sound when a message arrives. */
  sound: z.boolean().default(false),
  /** `mine` leaves out conversations assigned to somebody else. */
  about: notifyAboutSchema.default("all"),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const defaultPreferences: Preferences = preferencesSchema.parse({});

const STORAGE_KEY = "helpwren:notifications";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Preferences } | undefined;

/** Reads what is stored. Anything missing or damaged falls back to the defaults. */
export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function read(): Preferences {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked, in a private window for example. The defaults still work.
  }
  // The same object while nothing has changed, which is what React asks of a snapshot.
  if (cached?.raw !== raw) cached = { raw, value: parsePreferences(raw) };
  return cached.value;
}

export function savePreferences(preferences: Preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Nowhere to keep them: they last until the page is closed, through `cached`.
    cached = { raw: null, value: preferences };
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changing them changes them here too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The preferences, current as they change in this tab or another. Defaults on the server. */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, read, () => defaultPreferences);
}

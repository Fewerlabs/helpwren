/** Which way this device installs a web app. */
export type Platform = "ios" | "android" | "desktop";

/** A phone, by the width the dashboard switches to its bottom bar at. */
export const PHONE_QUERY = "(max-width: 767px)";
/** Running as an installed app, in a window of its own. */
export const STANDALONE_QUERY = "(display-mode: standalone)";

/** How long "Not now" keeps the install banner away. */
export const DISMISS_DAYS = 30;
const DISMISS_KEY = "helpwren:install-dismissed";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The platform, from the browser's description of itself. An iPad asks for desktop sites and
 * says it is a Mac, but a Mac has no touch screen.
 */
export function detectPlatform(userAgent: string, maxTouchPoints: number): Platform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (userAgent.includes("Macintosh") && maxTouchPoints > 1) return "ios";
  if (userAgent.includes("Android")) return "android";
  return "desktop";
}

/** The platform of the browser this runs in. */
export function currentPlatform(): Platform {
  return detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
}

/** Whether the dashboard is open as an installed app. Safari on iOS says so its own way. */
export function isStandalone(): boolean {
  const safari = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia(STANDALONE_QUERY).matches || safari.standalone === true;
}

export interface InstallOfferQuestion {
  platform: Platform;
  standalone: boolean;
  phone: boolean;
  /** The browser has offered to install the app (`beforeinstallprompt`). */
  canPrompt: boolean;
  /** "Not now" was chosen within the last month. */
  dismissed: boolean;
}

/** `prompt` uses the browser's own install dialog; `ios-steps` explains Add to Home Screen. */
export type InstallOffer = "prompt" | "ios-steps" | null;

/**
 * What the install banner should offer, if anything: only on a phone, in the browser, to
 * someone who has not said "Not now" lately. Safari has no install dialog, so it gets the steps.
 */
export function installOffer({
  platform,
  standalone,
  phone,
  canPrompt,
  dismissed,
}: InstallOfferQuestion): InstallOffer {
  if (standalone || !phone || dismissed) return null;
  if (canPrompt) return "prompt";
  if (platform === "ios") return "ios-steps";
  return null;
}

/** Whether a dismissal stored at `storedAt` (milliseconds, as text) still holds at `now`. */
export function dismissalHolds(storedAt: string | null, now: number): boolean {
  if (storedAt === null) return false;
  const at = Number(storedAt);
  return Number.isFinite(at) && now - at < DISMISS_DAYS * DAY_MS && at <= now;
}

/** Whether the banner was dismissed lately on this browser. */
export function wasDismissed(now = Date.now()): boolean {
  try {
    return dismissalHolds(window.localStorage.getItem(DISMISS_KEY), now);
  } catch {
    // Storage can be blocked, in a private window for example: then it was not.
    return false;
  }
}

/** Keeps the banner away for a month on this browser. */
export function rememberDismissal(now = Date.now()) {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    // Nowhere to keep it: the banner comes back on the next visit.
  }
}

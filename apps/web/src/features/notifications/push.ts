import { currentPlatform, isStandalone, WORKER_SCOPE } from "@/features/pwa";

import { getPushPublicKey, removePushSubscription, savePushSubscription } from "./actions";
import { type Preferences } from "./preferences";

/**
 * Whether this browser can get notifications with Helpwren closed. On an iPhone or iPad that
 * takes the app on the Home Screen first: Safari tabs cannot subscribe.
 */
export type PushSupport = "supported" | "needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
    return "supported";
  }
  if (currentPlatform() === "ios" && !isStandalone()) return "needs-install";
  return "unsupported";
}

/** How long to wait for the dashboard's service worker, and how often to look. */
const WORKER_WAIT_MS = 10_000;
const WORKER_LOOK_MS = 250;

/**
 * The dashboard's service worker once it is active. Registered as the dashboard opened, it may
 * still be installing. Not `navigator.serviceWorker.ready`, which never settles on a page that
 * was opened outside /dashboard, such as the sign-in page, and moved in without reloading.
 */
async function workerRegistration(): Promise<ServiceWorkerRegistration | null> {
  for (let waited = 0; waited <= WORKER_WAIT_MS; waited += WORKER_LOOK_MS) {
    const found = await navigator.serviceWorker.getRegistration(WORKER_SCOPE);
    if (found?.active) return found;
    await new Promise((resolve) => {
      window.setTimeout(resolve, WORKER_LOOK_MS);
    });
  }
  return null;
}

/** A VAPID public key, as PushManager takes it. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

/** This browser's subscription to pushes from this install, if it has one. */
export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const registration = await navigator.serviceWorker.getRegistration(WORKER_SCOPE);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Subscribes this browser to pushes and tells the server, with which conversations to send.
 * Safe to repeat: an existing subscription is kept, unless it was made with other keys.
 * Needs notification permission already given.
 */
export async function turnOnPush(about: Preferences["about"]): Promise<boolean> {
  if (pushSupport() !== "supported" || Notification.permission !== "granted") return false;
  const [registration, publicKey] = await Promise.all([workerRegistration(), getPushPublicKey()]);
  if (!registration || !publicKey) return false;

  const key = keyBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const result = await savePushSubscription(subscription.toJSON(), about);
  return result.ok;
}

/** Unsubscribes this browser, and tells the server to forget it. */
export async function turnOffPush(): Promise<void> {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  await removePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

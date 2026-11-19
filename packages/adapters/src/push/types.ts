/** One notification to one device. */
export interface PushMessage {
  /** The push service's address for the device. */
  to: string;
  title: string;
  /** A short preview. Never more than the push service's lock screen should show. */
  body: string;
  /** What the app needs to act on a tap, such as the conversation to open. */
  data: Record<string, string>;
  /**
   * Pushes in the same group replace each other on the device, so several quick replies in one
   * conversation show as one notification.
   */
  group: string;
  /** The number to show on the app's icon, where the platform supports it. */
  badge?: number;
}

/**
 * What the push service said about each message, in order. `id` is the ticket to ask for a
 * receipt with, for a service that has receipts. `gone` means the device will never
 * receive anything again and should be forgotten; `failed` is anything else.
 */
export type PushTicket =
  { ok: true; id: string | null } | { ok: false; reason: "gone" | "failed"; detail: string };

/** What happened to a message once the service has tried to deliver it. */
export type PushReceipt = { ok: true } | { ok: false; reason: "gone" | "failed"; detail: string };

/**
 * One way of sending pushes. `send` hands messages to the service and returns its tickets;
 * `receipts` asks, a while later, what became of them. Receipts the service does not have yet
 * are left out of the answer.
 */
export interface PushAdapter {
  name: string;
  send: (messages: readonly PushMessage[]) => Promise<PushTicket[]>;
  receipts: (ticketIds: readonly string[]) => Promise<Map<string, PushReceipt>>;
}

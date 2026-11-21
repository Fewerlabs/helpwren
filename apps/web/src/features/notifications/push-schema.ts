import { z } from "zod";

/** A browser's push subscription, as `PushSubscription.toJSON()` gives it. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/**
 * "Notify me about": every conversation, or `mine`, which leaves out conversations assigned to
 * somebody else. The server needs it to choose who hears about a conversation.
 */
export const notifyAboutSchema = z.enum(["all", "mine"]);

export type PushResult =
  { ok: true } | { ok: false; reason: "invalid" | "forbidden" | "rate_limited" | "failed" };

import "server-only";

import webpush, { WebPushError } from "web-push";
import { z } from "zod";

import { buildAgentPushPayload, type AgentPushPayload } from "@/lib/agent-push-payload";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadOrCreateVapidKeys, type VapidKeyPair } from "@/lib/vapid-keys";

/** The row in `secrets` that holds the VAPID keys the install made for itself. */
export const VAPID_KEYS_SECRET = "vapid_keys";

/** How many messages one run takes on, and how often a push is tried before it is given up. */
const BATCH = 100;
const MAX_ATTEMPTS = 3;
/** A push about a message from an hour ago is no longer news. */
const TTL_SECONDS = 60 * 60;
/** How long the push service is given to answer. */
const TIMEOUT_MS = 10_000;

/** The keys this install signs pushes with: from the environment, or made once and kept. */
export function getVapidKeys(): Promise<VapidKeyPair> {
  return loadOrCreateVapidKeys({
    fromEnv: { publicKey: serverEnv.VAPID_PUBLIC_KEY, privateKey: serverEnv.VAPID_PRIVATE_KEY },
    generate: () => webpush.generateVAPIDKeys(),
    store: {
      read: async () => {
        const { data, error } = await supabaseAdmin
          .from("secrets")
          .select("value")
          .eq("key", VAPID_KEYS_SECRET)
          .maybeSingle();
        if (error) throw error;
        return data?.value;
      },
      addIfMissing: async (keys) => {
        const { error } = await supabaseAdmin
          .from("secrets")
          .upsert({ key: VAPID_KEYS_SECRET, value: keys }, { ignoreDuplicates: true });
        if (error) throw error;
      },
    },
  });
}

/** The half of the keys a browser needs to subscribe. Public by design. */
export async function getVapidPublicKey(): Promise<string> {
  return (await getVapidKeys()).publicKey;
}

/** Who push services can contact about this install: a mailto: address or an https: page. */
function vapidSubject(): string {
  if (serverEnv.VAPID_SUBJECT) return serverEnv.VAPID_SUBJECT;
  const app = new URL(env.NEXT_PUBLIC_APP_URL);
  return app.protocol === "https:" ? app.origin : "mailto:webpush@localhost";
}

/** One browser to push to, as its PushManager described it. */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** `gone` means the push service no longer knows the browser, so it is forgotten. */
export type PushOutcome = "sent" | "gone" | "failed";

export type SendWebPush = (target: PushTarget, payload: AgentPushPayload) => Promise<PushOutcome>;

/** Sends through the browser's push service with web-push, signed with the install's keys. */
export async function createWebPushSender(): Promise<SendWebPush> {
  const keys = await getVapidKeys();
  const vapidDetails = { subject: vapidSubject(), ...keys };
  return async (target, payload) => {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
        {
          vapidDetails,
          TTL: TTL_SECONDS,
          urgency: "high",
          // A push still waiting at the push service is replaced by a newer one for the same
          // conversation. A topic is at most 32 URL-safe characters: a UUID without its dashes.
          topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32),
          timeout: TIMEOUT_MS,
        },
      );
      return "sent";
    } catch (error) {
      // Only the status is looked at: the error holds the endpoint, which is not logged.
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        return "gone";
      }
      return "failed";
    }
  };
}

export interface AgentPushRun {
  sent: number;
  skipped: number;
  failed: number;
  /** Browsers forgotten because their push service said they are gone. */
  removedSubscriptions: number;
}

const conversationSchema = z.object({
  id: z.uuid(),
  assignee_id: z.uuid().nullable(),
  unread_for_agents: z.number(),
  contact: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }),
});

interface Subscription extends PushTarget {
  id: string;
  agent_id: string;
  notify_about: string;
}

/** Whether a team member asked to hear about this conversation, as Notify me about says. */
function wantsToHear(subscription: Subscription, assigneeId: string | null): boolean {
  return (
    subscription.notify_about === "all" ||
    assigneeId === null ||
    assigneeId === subscription.agent_id
  );
}

/**
 * Tells the team about new messages from contacts, on every browser they turned notifications
 * on in: one push per conversation however many messages came since the last run, none for a
 * conversation someone has read meanwhile, and only to those whose Notify me about includes it.
 * The scheduler calls this every minute through `/api/jobs/push`.
 */
export async function processAgentPushQueue(send?: SendWebPush): Promise<AgentPushRun> {
  const run: AgentPushRun = { sent: 0, skipped: 0, failed: 0, removedSubscriptions: 0 };

  const claimed = await supabaseAdmin.rpc("claim_agent_push_queue", { batch: BATCH });
  if (claimed.error) throw claimed.error;
  const jobs = claimed.data;
  if (jobs.length === 0) return run;

  async function finish(ids: readonly string[], outcome: "sent" | "skipped" | "failed" | "retry") {
    const affected = jobs.filter((job) => ids.includes(job.id));
    const retry = outcome === "retry" && affected.every((job) => job.attempts < MAX_ATTEMPTS);
    const final = outcome === "retry" ? "failed" : outcome;
    const { error } = await supabaseAdmin
      .from("agent_push_queue")
      .update(retry ? { claimed_at: null } : { done_at: new Date().toISOString(), outcome: final })
      .in("id", ids);
    if (error) throw error;
    if (!retry) run[final] += ids.length;
  }

  const { data: rows, error: subscriptionsError } = await supabaseAdmin
    .from("agent_push_subscriptions")
    .select("id, agent_id, endpoint, p256dh, auth, notify_about, agent:agents!inner(active)")
    .eq("agent.active", true);
  if (subscriptionsError) throw subscriptionsError;
  let subscriptions: Subscription[] = rows;

  if (subscriptions.length === 0) {
    // Nobody to tell: what is owed is let go of, so the queue does not grow.
    await finish(
      jobs.map((job) => job.id),
      "skipped",
    );
    return run;
  }
  const sendPush = send ?? (await createWebPushSender());

  const byConversation = new Map<string, typeof jobs>();
  for (const job of jobs) {
    byConversation.set(job.conversation_id, [
      ...(byConversation.get(job.conversation_id) ?? []),
      job,
    ]);
  }

  for (const [conversationId, owed] of byConversation) {
    const ids = owed.map((job) => job.id);
    const { data: row, error } = await supabaseAdmin
      .from("conversations")
      .select("id, assignee_id, unread_for_agents, contact:contacts!inner(name, email, phone)")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw error;
    const conversation = conversationSchema.safeParse(row);
    // Read in the inbox since: the team already has it.
    if (!conversation.success || conversation.data.unread_for_agents === 0) {
      await finish(ids, "skipped");
      continue;
    }
    const { assignee_id: assigneeId, contact } = conversation.data;
    const audience = subscriptions.filter((subscription) => wantsToHear(subscription, assigneeId));
    if (audience.length === 0) {
      await finish(ids, "skipped");
      continue;
    }

    // The newest message is the one the notification shows.
    const latest = owed.toSorted((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .select("body")
      .eq("id", latest?.message_id ?? "")
      .maybeSingle();
    if (messageError) throw messageError;
    const payload = buildAgentPushPayload({
      conversationId,
      contact,
      body: message?.body ?? null,
    });

    const outcomes = await Promise.all(
      audience.map(async (subscription) => ({
        id: subscription.id,
        outcome: await sendPush(subscription, payload),
      })),
    );
    const delivered = outcomes.filter((result) => result.outcome === "sent").map(({ id }) => id);
    const gone = outcomes.filter((result) => result.outcome === "gone").map(({ id }) => id);

    if (delivered.length > 0) {
      const touched = await supabaseAdmin
        .from("agent_push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", delivered);
      if (touched.error) throw touched.error;
    }
    if (gone.length > 0) {
      const removed = await supabaseAdmin.from("agent_push_subscriptions").delete().in("id", gone);
      if (removed.error) throw removed.error;
      run.removedSubscriptions += gone.length;
      subscriptions = subscriptions.filter((subscription) => !gone.includes(subscription.id));
    }

    // A push service that could not be reached is tried again, unless another browser got it.
    const failed = outcomes.some((result) => result.outcome === "failed");
    await finish(ids, delivered.length > 0 ? "sent" : failed ? "retry" : "skipped");
  }
  return run;
}

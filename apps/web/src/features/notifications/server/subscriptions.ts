import "server-only";

import { type Database } from "@helpwren/core";
import { type SupabaseClient } from "@supabase/supabase-js";

import { LIMITS } from "@/lib/api/limits";
import { withinLimits } from "@/lib/api/rate-limit";

import { notifyAboutSchema, pushSubscriptionSchema, type PushResult } from "../push-schema";

/** A Supabase client acting as the signed-in team member, so the access rules apply. */
type AgentClient = SupabaseClient<Database>;

/** Keeps no more of a browser's description than the table allows. */
const USER_AGENT_LENGTH = 500;

/**
 * Keeps this browser's push subscription for the team member, with which conversations they
 * want to hear about. Saving one that is already kept updates it; one another team member kept
 * on this browser moves to this one.
 */
export async function saveSubscriptionAs(
  client: AgentClient,
  agentId: string,
  subscription: unknown,
  about: unknown,
  userAgent: string | null,
): Promise<PushResult> {
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  const topic = notifyAboutSchema.safeParse(about);
  if (!parsed.success || !topic.success) return { ok: false, reason: "invalid" };
  if (!(await withinLimits([[LIMITS.pushSubscriptionsPerAgent, agentId]]))) {
    return { ok: false, reason: "rate_limited" };
  }

  const { error } = await client.rpc("save_push_subscription", {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth_key: parsed.data.keys.auth,
    notify_about: topic.data,
    ...(userAgent ? { user_agent: userAgent.slice(0, USER_AGENT_LENGTH) } : {}),
  });
  if (error) return { ok: false, reason: error.code === "42501" ? "forbidden" : "failed" };
  return { ok: true };
}

/** Forgets this browser's subscription. The access rules let a team member remove only theirs. */
export async function removeSubscriptionAs(
  client: AgentClient,
  endpoint: unknown,
): Promise<PushResult> {
  const parsed = pushSubscriptionSchema.shape.endpoint.safeParse(endpoint);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { error } = await client
    .from("agent_push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data);
  if (error) return { ok: false, reason: "failed" };
  return { ok: true };
}

"use server";

import { headers } from "next/headers";

import { getCurrentAgent } from "@/features/agent-auth";
import { getVapidPublicKey } from "@/lib/agent-push";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { type PushResult } from "./push-schema";
import { removeSubscriptionAs, saveSubscriptionAs } from "./server/subscriptions";

/** The key a browser subscribes with, for a signed-in team member. Public, but only they need it. */
export async function getPushPublicKey(): Promise<string | null> {
  if (!(await getCurrentAgent())) return null;
  return getVapidPublicKey();
}

/** Keeps this browser's push subscription, so notifications arrive with Helpwren closed. */
export async function savePushSubscription(
  subscription: unknown,
  about: unknown,
): Promise<PushResult> {
  const agent = await getCurrentAgent();
  if (!agent) return { ok: false, reason: "forbidden" };
  const client = await createSupabaseServerClient();
  const userAgent = (await headers()).get("user-agent");
  return saveSubscriptionAs(client, agent.id, subscription, about, userAgent);
}

/** Forgets this browser's push subscription. */
export async function removePushSubscription(endpoint: unknown): Promise<PushResult> {
  if (!(await getCurrentAgent())) return { ok: false, reason: "forbidden" };
  return removeSubscriptionAs(await createSupabaseServerClient(), endpoint);
}

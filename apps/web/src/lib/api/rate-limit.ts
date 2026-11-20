import "server-only";

import {
  createDatabaseRateLimit,
  createMemoryRateLimit,
  type RateLimitRule,
  type RateLimitStore,
} from "@helpwren/adapters";

import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { clientAddress, networkKey } from "./network";
import { apiError } from "./respond";

/** A limit on one kind of request. `name` keeps its counts apart from every other limit's. */
export interface Limit extends RateLimitRule {
  name: string;
}

// The database by default, so that several copies of the app share one count. Memory is for a
// single server that would rather not write a row per request.
const store: RateLimitStore =
  serverEnv.RATE_LIMIT_STORE === "memory"
    ? createMemoryRateLimit()
    : createDatabaseRateLimit((args) => supabaseAdmin.rpc("hit_rate_limit", args));

/** Where a request came from: its network address, and the keyed hash that stands for it. */
export interface RequestNetwork {
  address: string | null;
  key: string | null;
}

export function requestNetwork(request: Request): RequestNetwork {
  const address = clientAddress(request.headers, serverEnv.CLIENT_IP_HEADER);
  return { address, key: networkKey(address, serverEnv.SUPABASE_SECRET_KEY) };
}

/**
 * Counts a request under each limit whose key is known: a network, a session, a conversation.
 * Returns the response to send when one of them is used up, or `null` to go ahead. A key that
 * is not known, such as the network of a request with no proxy in front, is not counted.
 */
export async function checkLimits(
  checks: readonly (readonly [Limit, string | null | undefined])[],
): Promise<Response | null> {
  for (const [limit, key] of checks) {
    if (!key) continue;
    if (!(await store.hit(`${limit.name}:${key}`, limit))) {
      const response = apiError("rate_limited", "Too many requests. Wait a little and try again.");
      response.headers.set("retry-after", String(limit.windowSeconds));
      return response;
    }
  }
  return null;
}

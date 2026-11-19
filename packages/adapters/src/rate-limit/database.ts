import { type RateLimitStore } from "./types";

/**
 * The one call the database store makes: Helpwren's `hit_rate_limit` function, through a
 * Supabase client with the secret key. Typed loosely, so this package needs no Supabase types.
 */
export type HitRateLimit = (args: {
  key: string;
  max_hits: number;
  window_seconds: number;
}) => PromiseLike<{ data: boolean | null; error: unknown }>;

/**
 * Counts requests in the install's own database (`public.rate_limits`), so every copy of the
 * app shares one count. One small write per request, which the free database plans carry.
 */
export function createDatabaseRateLimit(hitRateLimit: HitRateLimit): RateLimitStore {
  return {
    async hit(key, { limit, windowSeconds }) {
      const { data, error } = await hitRateLimit({
        key,
        max_hits: limit,
        window_seconds: windowSeconds,
      });
      if (error) throw error instanceof Error ? error : new Error("Could not count a request.");
      return data === true;
    },
  };
}

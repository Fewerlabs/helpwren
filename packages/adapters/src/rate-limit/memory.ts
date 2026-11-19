import { type RateLimitStore } from "./types";

export interface MemoryRateLimitOptions {
  /** Past this many keys, the oldest are forgotten, so memory stays bounded. */
  maxKeys?: number;
  /** Replaces the clock, for tests. Milliseconds, as `Date.now`. */
  now?: () => number;
}

/**
 * Counts requests in this process's memory, in fixed windows. Right for one server, and for
 * development. Several servers each keep their own count, and a restart forgets them all.
 */
export function createMemoryRateLimit({
  maxKeys = 10_000,
  now = Date.now,
}: MemoryRateLimitOptions = {}): RateLimitStore {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    hit(key, { limit, windowSeconds }) {
      const time = now();
      const windowMs = windowSeconds * 1000;
      const current = windows.get(key);
      if (!current || time - current.start >= windowMs) {
        windows.delete(key);
        if (windows.size >= maxKeys) {
          // Maps keep insertion order, so the first key is the one written longest ago.
          const oldest = windows.keys().next().value;
          if (oldest !== undefined) windows.delete(oldest);
        }
        windows.set(key, { start: time, count: 1 });
        return Promise.resolve(1 <= limit);
      }
      current.count += 1;
      return Promise.resolve(current.count <= limit);
    },
  };
}

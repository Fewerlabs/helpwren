/** How many requests one key may make in a window. */
export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

/**
 * Where request counts are kept. The app counts each request against a key, such as a network
 * or a session, and refuses it when the key is over its rule. A store shared by every copy of
 * the app (a database, Redis) gives one count; a store in memory gives each copy its own.
 */
export interface RateLimitStore {
  /** Counts one request against the key and says whether it is within the rule. */
  hit(key: string, rule: RateLimitRule): Promise<boolean>;
}

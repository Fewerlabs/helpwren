/**
 * Counts requests by key in fixed windows, in this server's memory. It protects the database
 * from one runaway browser; it is not shared between servers and does not survive a restart,
 * which is fine for that.
 */
export function createRateLimit({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  /** How many requests one key may make in a window. */
  limit: number;
  windowMs: number;
  /** Past this many keys, the oldest are forgotten, so memory stays bounded. */
  maxKeys?: number;
}) {
  const windows = new Map<string, { start: number; count: number }>();

  /** Whether a request with this key may go ahead now. */
  return function allow(key: string, now = Date.now()): boolean {
    const current = windows.get(key);
    if (!current || now - current.start >= windowMs) {
      windows.delete(key);
      if (windows.size >= maxKeys) {
        // Maps keep insertion order, so the first key is the one written longest ago.
        const oldest = windows.keys().next().value;
        if (oldest !== undefined) windows.delete(oldest);
      }
      windows.set(key, { start: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  };
}

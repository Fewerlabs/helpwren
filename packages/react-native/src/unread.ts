export interface UnreadCountOptions {
  /** Where the Helpwren install is, such as `https://support.example.com`. */
  baseUrl: string;
  /** The user's token for your product, the same one the support screen is given. */
  token: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
}

/** Why the count could not be had. `expired`: fetch a fresh token and ask again. */
export type UnreadCountResult =
  { ok: true; count: number } | { ok: false; reason: "expired" | "rejected" | "unavailable" };

/**
 * How many replies the user has not read, for the badge on your app's icon or help button.
 * Call it when your app comes to the front, not on a timer. It needs no Helpwren session: the
 * install checks the token as it does when the support screen opens.
 */
export async function getUnreadCount(options: UnreadCountOptions): Promise<UnreadCountResult> {
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Response;
  try {
    response = await send(new URL("/api/unread", options.baseUrl).href, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: options.token }),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const count = (body as { count?: unknown } | null)?.count;
    if (typeof count === "number" && Number.isInteger(count) && count >= 0) {
      return { ok: true, count };
    }
    return { ok: false, reason: "unavailable" };
  }
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  if (code === "token_expired") return { ok: false, reason: "expired" };
  if (code === "token_rejected" || code === "forbidden") return { ok: false, reason: "rejected" };
  return { ok: false, reason: "unavailable" };
}

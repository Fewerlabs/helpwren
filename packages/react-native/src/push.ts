export interface SupportDevice {
  /** Where the Helpwren install is, such as `https://support.example.com`. */
  baseUrl: string;
  /**
   * The phone's push token: an Expo push token from `getExpoPushTokenAsync`, or a Firebase
   * registration token from `messaging().getToken()` with `provider: "fcm"`.
   */
  pushToken: string;
  /** Which service the token is for. Default `expo`. */
  provider?: "expo" | "fcm";
  platform: "ios" | "android";
  /** Which of the install's sources this app is, such as `customer_app`. */
  source: string;
  /** The logged-in user's token for your product, as the support screen is given it. */
  token: string;
  /** Replaces `fetch`, for tests. */
  fetch?: typeof globalThis.fetch;
}

export type SupportDeviceResult =
  { ok: true } | { ok: false; reason: "expired" | "rejected" | "invalid" | "unavailable" };

async function call(
  method: "POST" | "DELETE",
  baseUrl: string,
  body: unknown,
  fetcher: typeof globalThis.fetch | undefined,
): Promise<SupportDeviceResult> {
  const send = fetcher ?? globalThis.fetch.bind(globalThis);
  let response: Response;
  try {
    response = await send(new URL("/api/devices", baseUrl).href, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (response.ok) return { ok: true };

  const payload: unknown = await response.json().catch(() => null);
  const code = (payload as { error?: { code?: unknown } } | null)?.error?.code;
  if (code === "token_expired") return { ok: false, reason: "expired" };
  if (code === "token_rejected" || code === "forbidden") return { ok: false, reason: "rejected" };
  if (code === "invalid_request") return { ok: false, reason: "invalid" };
  return { ok: false, reason: "unavailable" };
}

/**
 * Tells the install which phone to notify when your team replies to this user. Call it when
 * the app starts with someone logged in, and again when the push token changes. It works
 * before the user has ever opened the chat.
 */
export function registerSupportDevice(device: SupportDevice): Promise<SupportDeviceResult> {
  return call(
    "POST",
    device.baseUrl,
    {
      pushToken: device.pushToken,
      provider: device.provider ?? "expo",
      platform: device.platform,
      app: device.source,
      token: device.token,
    },
    device.fetch,
  );
}

/** Stops replies being pushed to this phone. Call it when the user logs out. */
export function unregisterSupportDevice(options: {
  baseUrl: string;
  pushToken: string;
  fetch?: typeof globalThis.fetch;
}): Promise<SupportDeviceResult> {
  return call("DELETE", options.baseUrl, { pushToken: options.pushToken }, options.fetch);
}

/**
 * The conversation a notification is about, if it is one of Helpwren's; `null` for any other
 * notification. Pass it the notification's `data`, and open the support screen with the
 * result as `conversationId`.
 */
export function supportConversationId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, conversationId } = data as { type?: unknown; conversationId?: unknown };
  return type === "support" && typeof conversationId === "string" ? conversationId : null;
}

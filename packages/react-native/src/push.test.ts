import { describe, expect, it, vi } from "vitest";

import { registerSupportDevice, supportConversationId, unregisterSupportDevice } from "./push";

const BASE = "https://support.example.com";

function answering(status: number, body?: unknown) {
  return vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

describe("push helpers for the app", () => {
  it("registers the phone with the user's own token", async () => {
    const fetch = answering(204);
    await expect(
      registerSupportDevice({
        baseUrl: BASE,
        pushToken: "ExponentPushToken[abc]",
        platform: "ios",
        source: "customer_app",
        token: "users-own-token",
        fetch,
      }),
    ).resolves.toEqual({ ok: true });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://support.example.com/api/devices");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      pushToken: "ExponentPushToken[abc]",
      provider: "expo",
      platform: "ios",
      app: "customer_app",
      token: "users-own-token",
    });
  });

  it("registers a Firebase token as one", async () => {
    const fetch = answering(204);
    await registerSupportDevice({
      baseUrl: BASE,
      pushToken: "fcm-registration-token",
      provider: "fcm",
      platform: "android",
      source: "business_app",
      token: "users-own-token",
      fetch,
    });
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      pushToken: "fcm-registration-token",
      provider: "fcm",
    });
  });

  it("says why a phone could not be registered", async () => {
    const device = {
      baseUrl: BASE,
      pushToken: "ExponentPushToken[abc]",
      platform: "android" as const,
      source: "customer_app",
      token: "users-own-token",
    };
    const expired = answering(401, { error: { code: "token_expired", message: "" } });
    const invalid = answering(400, { error: { code: "invalid_request", message: "" } });
    const offline = vi.fn(() => Promise.reject(new TypeError("Network request failed")));

    await expect(registerSupportDevice({ ...device, fetch: expired })).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
    await expect(registerSupportDevice({ ...device, fetch: invalid })).resolves.toEqual({
      ok: false,
      reason: "invalid",
    });
    await expect(registerSupportDevice({ ...device, fetch: offline })).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("unregisters the phone on logout", async () => {
    const fetch = answering(204);
    await expect(
      unregisterSupportDevice({ baseUrl: BASE, pushToken: "ExponentPushToken[abc]", fetch }),
    ).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });

  it("finds the conversation in a Helpwren notification, and nothing in any other", () => {
    expect(supportConversationId({ type: "support", conversationId: "c-1" })).toBe("c-1");
    expect(supportConversationId({ type: "booking", conversationId: "c-1" })).toBeNull();
    expect(supportConversationId({ type: "support" })).toBeNull();
    expect(supportConversationId(null)).toBeNull();
  });
});

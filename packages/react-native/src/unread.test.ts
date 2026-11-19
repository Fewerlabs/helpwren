import { describe, expect, it, vi } from "vitest";

import { getUnreadCount } from "./unread";

function answering(status: number, body: unknown) {
  return vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

const options = { baseUrl: "https://support.example.com", token: "users-own-token" };

describe("getUnreadCount", () => {
  it("asks the install with the user's token, and returns the count", async () => {
    const fetch = answering(200, { count: 3 });

    await expect(getUnreadCount({ ...options, fetch })).resolves.toEqual({ ok: true, count: 3 });
    expect(fetch).toHaveBeenCalledWith("https://support.example.com/api/unread", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "users-own-token" }),
    });
  });

  it("says when the token has expired, so the app can fetch another", async () => {
    const fetch = answering(401, { error: { code: "token_expired", message: "Expired." } });
    await expect(getUnreadCount({ ...options, fetch })).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("says when the token will never work", async () => {
    const fetch = answering(401, { error: { code: "token_rejected", message: "No." } });
    await expect(getUnreadCount({ ...options, fetch })).resolves.toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  it("says the install is unavailable when it cannot be reached or answers oddly", async () => {
    const offline = vi.fn(() => Promise.reject(new TypeError("Network request failed")));
    await expect(getUnreadCount({ ...options, fetch: offline })).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
    await expect(
      getUnreadCount({ ...options, fetch: answering(200, { count: "three" }) }),
    ).resolves.toEqual({ ok: false, reason: "unavailable" });
    await expect(getUnreadCount({ ...options, fetch: answering(500, {}) })).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});

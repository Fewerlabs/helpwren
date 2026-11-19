import { describe, expect, it, vi } from "vitest";

import {
  createWebhookPush,
  signWebhook,
  verifyWebhook,
  WEBHOOK_SIGNATURE_HEADER,
  type PushEvent,
} from "./webhook";

const SECRET = "whsec_test_secret_test_secret";

const event: PushEvent = {
  type: "push.reply",
  id: "evt-1",
  conversationId: "c-1",
  contact: { id: "k-1", externalId: "user-42" },
  title: "Acme",
  preview: "It went out this morning.",
  unreadCount: 2,
  sentAt: "2026-11-19T10:00:00.000Z",
};

describe("the push webhook", () => {
  it("posts the event, signed with the secret and the time", async () => {
    const fetch = vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
      Promise.resolve(new Response(null, { status: 204 })),
    );

    await expect(
      createWebhookPush({ url: "https://api.example.com/helpwren", secret: SECRET, fetch }).send(
        event,
      ),
    ).resolves.toEqual({ ok: true });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/helpwren");
    expect(init?.redirect).toBe("error");
    const body = init?.body as string;
    expect(JSON.parse(body)).toEqual(event);
    const headers = init?.headers as Record<string, string>;
    expect(verifyWebhook(body, headers[WEBHOOK_SIGNATURE_HEADER] ?? "", SECRET)).toBe(true);
  });

  it("says why the product's backend did not take it", async () => {
    const refused = vi.fn(() => Promise.resolve(new Response(null, { status: 500 })));
    const offline = vi.fn(() => Promise.reject(new TypeError("fetch failed")));
    const options = { url: "https://api.example.com/helpwren", secret: SECRET };

    await expect(createWebhookPush({ ...options, fetch: refused }).send(event)).resolves.toEqual({
      ok: false,
      detail: "The address answered with status 500.",
    });
    await expect(
      createWebhookPush({ ...options, fetch: offline }).send(event),
    ).resolves.toMatchObject({ ok: false });
  });

  it("verifies only an unchanged body, signed with the secret, within five minutes", () => {
    const body = JSON.stringify(event);
    const now = Date.parse("2026-11-19T10:00:00Z");
    const signedAt = Math.floor(now / 1000);
    const header = signWebhook(body, SECRET, signedAt);

    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(verifyWebhook(body, header, SECRET, now)).toBe(true);
    expect(verifyWebhook(body.replace("user-42", "user-1"), header, SECRET, now)).toBe(false);
    expect(verifyWebhook(body, header, "another-secret", now)).toBe(false);
    // The same request sent again later is turned away.
    expect(verifyWebhook(body, header, SECRET, now + 6 * 60 * 1000)).toBe(false);
    expect(verifyWebhook(body, "v1=abc", SECRET, now)).toBe(false);
  });
});

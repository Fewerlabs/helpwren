import { describe, expect, it, vi } from "vitest";

import { createExpoPush, isExpoPushToken } from "./expo";
import { type PushMessage } from "./types";

function message(to: string): PushMessage {
  return {
    to,
    title: "Acme",
    body: "It went out this morning.",
    data: { type: "support", conversationId: "c-1" },
    group: "c-1",
    badge: 2,
  };
}

function expoAnswering(...answers: unknown[]) {
  const queue = [...answers];
  return vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify(queue.shift()), { status: 200 })),
  );
}

describe("the Expo push adapter", () => {
  it("sends each message once, grouped by conversation, with the access token", async () => {
    const fetch = expoAnswering({ data: [{ status: "ok", id: "ticket-1" }] });
    const push = createExpoPush({ accessToken: "expo-token", fetch });

    await expect(push.send([message("ExponentPushToken[a]")])).resolves.toEqual([
      { ok: true, id: "ticket-1" },
    ]);

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    expect(init?.headers).toMatchObject({ authorization: "Bearer expo-token" });
    expect(JSON.parse(init?.body as string)).toEqual([
      {
        to: "ExponentPushToken[a]",
        title: "Acme",
        body: "It went out this morning.",
        data: { type: "support", conversationId: "c-1" },
        sound: "default",
        priority: "high",
        collapseId: "c-1",
        tag: "c-1",
        badge: 2,
      },
    ]);
  });

  it("sends no credential when the project does not need one", async () => {
    const fetch = expoAnswering({ data: [{ status: "ok", id: "ticket-1" }] });
    await createExpoPush({ fetch }).send([message("ExponentPushToken[a]")]);
    expect(fetch.mock.calls[0]?.[1]?.headers).not.toHaveProperty("authorization");
  });

  it("sends a hundred at a time, as Expo asks", async () => {
    const ok = (count: number) => ({
      data: Array.from({ length: count }, (_, index) => ({
        status: "ok",
        id: `t-${String(index)}`,
      })),
    });
    const fetch = expoAnswering(ok(100), ok(50));
    const messages = Array.from({ length: 150 }, (_, index) =>
      message(`ExponentPushToken[${String(index)}]`),
    );

    await expect(createExpoPush({ fetch }).send(messages)).resolves.toHaveLength(150);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("says when a device is gone for good, apart from other failures", async () => {
    const fetch = expoAnswering({
      data: [
        { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } },
        { status: "error", message: "too big", details: { error: "MessageTooBig" } },
      ],
    });

    await expect(
      createExpoPush({ fetch }).send([
        message("ExponentPushToken[a]"),
        message("ExponentPushToken[b]"),
      ]),
    ).resolves.toEqual([
      { ok: false, reason: "gone", detail: "DeviceNotRegistered: not registered" },
      { ok: false, reason: "failed", detail: "MessageTooBig: too big" },
    ]);
  });

  it("reads receipts, leaving out those not ready", async () => {
    const fetch = expoAnswering({
      data: {
        "ticket-1": { status: "ok" },
        "ticket-2": {
          status: "error",
          message: "gone",
          details: { error: "DeviceNotRegistered" },
        },
      },
    });

    const receipts = await createExpoPush({ fetch }).receipts(["ticket-1", "ticket-2", "ticket-3"]);

    expect(Object.fromEntries(receipts)).toEqual({
      "ticket-1": { ok: true },
      "ticket-2": { ok: false, reason: "gone", detail: "DeviceNotRegistered: gone" },
    });
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string)).toEqual({
      ids: ["ticket-1", "ticket-2", "ticket-3"],
    });
  });

  it("throws when Expo refuses the whole request, so it is tried again later", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ errors: [{ message: "Too many requests" }] }), {
          status: 429,
        }),
      ),
    );
    await expect(createExpoPush({ fetch }).send([message("ExponentPushToken[a]")])).rejects.toThrow(
      "Too many requests",
    );
  });

  it("knows an Expo push token when it sees one", () => {
    expect(isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc]")).toBe(true);
    expect(isExpoPushToken("fcm-device-token")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
  });
});

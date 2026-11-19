import { type PushAdapter, type PushMessage, type PushTicket } from "@helpwren/adapters";
import { identifyResponseSchema } from "@helpwren/core";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as unregister, POST as register } from "@/app/api/devices/route";
import { POST as identify } from "@/app/api/identify/route";
import { IDENTITY_KEYS_SECRET, IDENTITY_SETTING } from "@/lib/identity";
import { processPushQueue, PUSH_SETTING } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest } from "./support/people";

// Registering phones and sending pushes, against the local database. The push service is a
// stand-in that records what it was given, so nothing leaves this machine.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const key = { id: "push", secret: crypto.randomUUID() + crypto.randomUUID() };
const run = crypto.randomUUID();
const AGENT_ID = "a0000000-0000-4000-8000-000000000002";
const userIds = new Set<string>();
const pushTokens = new Set<string>();

/** A push service that accepts everything, unless told a device is gone. */
function fakePush(gone: readonly string[] = []) {
  const sent: PushMessage[] = [];
  const receipts = new Map<string, { ok: false; reason: "gone"; detail: string }>();
  const adapter: PushAdapter = {
    name: "Fake",
    send: (messages) => {
      sent.push(...messages);
      return Promise.resolve(
        messages.map((message, index): PushTicket =>
          gone.includes(message.to)
            ? { ok: false, reason: "gone", detail: "DeviceNotRegistered" }
            : { ok: true, id: `${run}-${String(sent.length)}-${String(index)}` },
        ),
      );
    },
    receipts: (ids) =>
      Promise.resolve(
        new Map(
          ids.flatMap((id) => {
            const receipt = receipts.get(id);
            return receipt ? [[id, receipt] as const] : [];
          }),
        ),
      ),
  };
  return { adapter, sent, receipts };
}

function pushToken(name: string) {
  const token = `ExponentPushToken[${run}-${name}]`;
  pushTokens.add(token);
  return token;
}

function tokenFor(name: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", kid: key.id })
    .setSubject(`${run}:${name}`)
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(key.secret));
}

function call(handler: typeof register, body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request("http://localhost/api/devices", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

/** A product user who has written once, and the conversation they wrote in. */
async function userWithConversation(name: string) {
  const response = await identify(
    new Request("http://localhost/api/identify", {
      method: "POST",
      body: JSON.stringify({ token: await tokenFor(name) }),
    }),
  );
  const { userId } = identifyResponseSchema.parse(await response.json());
  userIds.add(userId);
  const { data: conversationId, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: userId,
    body: "Where is my order?",
    source: "web",
  });
  if (error) throw error;
  return { userId, conversationId };
}

async function reply(conversationId: string, body: string) {
  const { error } = await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: AGENT_ID,
    sender_role: "agent",
    body,
  });
  if (error) throw error;
}

/** Makes this conversation's queued pushes due now, instead of in a few seconds. */
async function due(conversationId: string) {
  const { error } = await supabaseAdmin
    .from("push_queue")
    .update({ send_after: new Date(Date.now() - 1000).toISOString() })
    .eq("conversation_id", conversationId)
    .is("done_at", null);
  if (error) throw error;
}

async function devicesWith(token: string) {
  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("contact_id, external_id, platform, app")
    .eq("push_token", token);
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  await supabaseAdmin.from("settings").upsert([
    { key: IDENTITY_SETTING, value: { mode: "signed_token" } },
    { key: PUSH_SETTING, value: { provider: "expo" } },
  ]);
  await supabaseAdmin.from("secrets").upsert({ key: IDENTITY_KEYS_SECRET, value: [key] });
});

beforeEach(async () => {
  // Whatever other tests left due is let go of, so each run here sees only its own.
  await supabaseAdmin
    .from("push_queue")
    .update({ done_at: new Date().toISOString(), outcome: "skipped" })
    .is("done_at", null);
});

afterAll(async () => {
  await supabaseAdmin.from("settings").delete().in("key", [IDENTITY_SETTING, PUSH_SETTING]);
  await supabaseAdmin.from("secrets").delete().eq("key", IDENTITY_KEYS_SECRET);
  await supabaseAdmin
    .from("devices")
    .delete()
    .in("push_token", [...pushTokens]);
  const ids = [...userIds];
  await supabaseAdmin.from("conversations").delete().in("contact_id", ids);
  const removed = await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
  if (removed.some(({ error }) => error && error.status !== 404)) {
    throw new Error("Left test users behind.");
  }
});

describe("registering a phone", () => {
  it("takes the app's own token for its user, before they have written", async () => {
    const token = pushToken("before");
    const response = await call(register, {
      pushToken: token,
      platform: "ios",
      app: "web",
      token: await tokenFor("not-yet"),
    });

    expect(response.status).toBe(204);
    await expect(devicesWith(token)).resolves.toEqual([
      { contact_id: null, external_id: `${run}:not-yet`, platform: "ios", app: "web" },
    ]);
  });

  it("takes a guest's session, once they have written, and moves a phone to whoever has it now", async () => {
    const guest = await newGuest();
    userIds.add(guest.id);
    const token = pushToken("guest");
    const early = await call(
      register,
      { pushToken: token, platform: "android", app: "web" },
      guest.headers,
    );
    expect(early.status).toBe(404);

    await supabaseAdmin.rpc("start_conversation", {
      contact_id: guest.id,
      body: "Hello",
      source: "web",
      contact_name: "Guest",
    });
    await call(register, { pushToken: token, platform: "android", app: "web" }, guest.headers);
    await expect(devicesWith(token)).resolves.toEqual([
      { contact_id: guest.id, external_id: null, platform: "android", app: "web" },
    ]);

    // The same phone, now logged in as a product user.
    await call(register, {
      pushToken: token,
      platform: "android",
      app: "web",
      token: await tokenFor("new-owner"),
    });
    await expect(devicesWith(token)).resolves.toEqual([
      { contact_id: null, external_id: `${run}:new-owner`, platform: "android", app: "web" },
    ]);
  });

  it("turns away what is not an Expo push token, an unknown app, and nobody at all", async () => {
    const valid = { pushToken: pushToken("checks"), platform: "ios", app: "web" };
    expect((await call(register, { ...valid, pushToken: "fcm-token" })).status).toBe(400);
    expect((await call(register, { ...valid, app: "not-a-source" })).status).toBe(400);
    expect((await call(register, valid)).status).toBe(401);
  });

  it("stops pushes to a phone that logs out", async () => {
    const token = pushToken("leaving");
    await call(register, {
      pushToken: token,
      platform: "ios",
      app: "web",
      token: await tokenFor("leaving"),
    });

    const response = await call(unregister, { pushToken: token });

    expect(response.status).toBe(204);
    await expect(devicesWith(token)).resolves.toEqual([]);
  });
});

describe("sending pushes", () => {
  it("sends one notification per conversation for the team's replies, with the newest", async () => {
    const { conversationId } = await userWithConversation("orders");
    const token = pushToken("orders");
    await call(register, {
      pushToken: token,
      platform: "ios",
      app: "web",
      token: await tokenFor("orders"),
    });
    await reply(conversationId, "Looking into it now.");
    await reply(conversationId, "It went out   this morning.");
    await due(conversationId);
    const push = fakePush();

    const result = await processPushQueue(push.adapter);

    expect(result).toMatchObject({ sent: 2, failed: 0 });
    expect(push.sent).toEqual([
      {
        to: token,
        title: expect.any(String) as string,
        body: "It went out this morning.",
        data: { type: "support", conversationId },
        group: conversationId,
        badge: 2,
      },
    ]);
    const { data: tickets } = await supabaseAdmin
      .from("push_tickets")
      .select("id")
      .like("id", `${run}-%`);
    expect(tickets).toHaveLength(1);
  });

  it("sends nothing for a reply read in the chat before it was due", async () => {
    const { conversationId } = await userWithConversation("read-it");
    const token = pushToken("read-it");
    await call(register, {
      pushToken: token,
      platform: "ios",
      app: "web",
      token: await tokenFor("read-it"),
    });
    await reply(conversationId, "Here you go.");
    await supabaseAdmin
      .from("conversations")
      .update({ unread_for_contact: 0 })
      .eq("id", conversationId);
    await due(conversationId);
    const push = fakePush();

    await expect(processPushQueue(push.adapter)).resolves.toMatchObject({ sent: 0, skipped: 1 });
    expect(push.sent).toEqual([]);
  });

  it("forgets a phone the push service says is gone, at once or from its receipt", async () => {
    const { conversationId } = await userWithConversation("gone");
    const goneNow = pushToken("gone-now");
    const goneLater = pushToken("gone-later");
    for (const token of [goneNow, goneLater]) {
      await call(register, {
        pushToken: token,
        platform: "ios",
        app: "web",
        token: await tokenFor("gone"),
      });
    }
    await reply(conversationId, "Still there?");
    await due(conversationId);
    const push = fakePush([goneNow]);

    await expect(processPushQueue(push.adapter)).resolves.toMatchObject({
      sent: 1,
      removedDevices: 1,
    });
    await expect(devicesWith(goneNow)).resolves.toEqual([]);

    // A quarter of an hour later, the other one's receipt says it is gone too.
    const { data: device } = await supabaseAdmin
      .from("devices")
      .select("id")
      .eq("push_token", goneLater)
      .single();
    const { data: ticket } = await supabaseAdmin
      .from("push_tickets")
      .update({ created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() })
      .eq("device_id", device?.id ?? "")
      .select("id")
      .single();
    push.receipts.set(ticket?.id ?? "", {
      ok: false,
      reason: "gone",
      detail: "DeviceNotRegistered",
    });

    await expect(processPushQueue(push.adapter)).resolves.toMatchObject({ removedDevices: 1 });
    await expect(devicesWith(goneLater)).resolves.toEqual([]);
  });

  it("lets owed pushes go when push is off", async () => {
    const { conversationId } = await userWithConversation("off");
    await reply(conversationId, "Hello?");
    await due(conversationId);
    await supabaseAdmin.from("settings").upsert({ key: PUSH_SETTING, value: { provider: "none" } });
    try {
      await expect(processPushQueue()).resolves.toMatchObject({ sent: 0, skipped: 1 });
    } finally {
      await supabaseAdmin
        .from("settings")
        .upsert({ key: PUSH_SETTING, value: { provider: "expo" } });
    }
  });
});

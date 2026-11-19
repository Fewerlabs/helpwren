import { type SigningKey } from "@helpwren/adapters";
import { identifyResponseSchema } from "@helpwren/core";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as identify } from "@/app/api/identify/route";
import { POST as unread } from "@/app/api/unread/route";
import { IDENTITY_KEYS_SECRET, IDENTITY_SETTING } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, signInAgent } from "./support/people";

// The badge count an app asks for, called directly against the local database with the
// install set up to accept signed tokens.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const key: SigningKey = { id: "unread", secret: crypto.randomUUID() + crypto.randomUUID() };
const run = crypto.randomUUID();
const userIds = new Set<string>();
const AGENT_ID = "a0000000-0000-4000-8000-000000000002";

function tokenFor(name: string, secret = key.secret) {
  return new SignJWT({ sub: `${run}:${name}` })
    .setProtectedHeader({ alg: "HS256", kid: key.id })
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

function ask(body: unknown, headers: Record<string, string> = {}) {
  return unread(
    new Request("http://localhost/api/unread", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

/** A user who has written once and had `replies` answers from the team they have not read. */
async function userWithReplies(name: string, replies: number) {
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
    body: "Hello",
    source: "web",
  });
  if (error) throw error;
  for (let reply = 0; reply < replies; reply += 1) {
    const inserted = await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: AGENT_ID,
      sender_role: "agent",
      body: `Reply ${String(reply + 1)}`,
    });
    if (inserted.error) throw inserted.error;
  }
  return userId;
}

beforeAll(async () => {
  await supabaseAdmin
    .from("settings")
    .upsert({ key: IDENTITY_SETTING, value: { mode: "signed_token" } });
  await supabaseAdmin.from("secrets").upsert({ key: IDENTITY_KEYS_SECRET, value: [key] });
});

afterAll(async () => {
  await supabaseAdmin.from("settings").delete().eq("key", IDENTITY_SETTING);
  await supabaseAdmin.from("secrets").delete().eq("key", IDENTITY_KEYS_SECRET);
  const ids = [...userIds];
  await supabaseAdmin.from("conversations").delete().in("contact_id", ids);
  const removed = await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
  if (removed.some(({ error }) => error)) throw new Error("Left test users behind.");
});

describe("POST /api/unread", () => {
  it("counts a user's unread replies from the token their app already has", async () => {
    await userWithReplies("ana", 2);

    const response = await ask({ token: await tokenFor("ana") });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 2 });
  });

  it("answers nought for a user who has never written, and creates no one", async () => {
    const response = await ask({ token: await tokenFor("never-wrote") });

    await expect(response.json()).resolves.toEqual({ count: 0 });
    const { data } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("external_id", `${run}:never-wrote`);
    expect(data).toEqual([]);
  });

  it("counts for a Helpwren session too", async () => {
    const guest = await newGuest();
    userIds.add(guest.id);

    const response = await ask({}, guest.headers);
    await expect(response.json()).resolves.toEqual({ count: 0 });
  });

  it("turns away a token the install did not sign, and a request with nothing", async () => {
    const forged = await ask({ token: await tokenFor("ana", "b".repeat(40)) });
    expect(forged.status).toBe(401);
    await expect(forged.json()).resolves.toMatchObject({ error: { code: "token_rejected" } });

    expect((await ask({})).status).toBe(401);
  });

  it("has nothing to count for a team member", async () => {
    const agent = await signInAgent("sam@example.com");
    expect((await ask({}, agent.headers)).status).toBe(403);
  });
});

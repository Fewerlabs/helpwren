import { type SigningKey } from "@helpwren/adapters";
import { identifyResponseSchema } from "@helpwren/core";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as identify } from "@/app/api/identify/route";
import { IDENTITY_KEYS_SECRET, IDENTITY_SETTING } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, type Person } from "./support/people";

// The identify route, called directly against the local database, with the install set up to
// accept signed tokens.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const key: SigningKey = { id: "test", secret: crypto.randomUUID() + crypto.randomUUID() };
const run = crypto.randomUUID();
const userIds = new Set<string>();

function sign(claims: Record<string, unknown>, secret = key.secret, expiresIn = "5m") {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", kid: key.id })
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return identify(
    new Request("http://localhost/api/identify", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

async function signedIn(claims: Record<string, unknown>, as?: { headers: Person["headers"] }) {
  const response = await post({ token: await sign(claims) }, as?.headers);
  expect(response.status).toBe(200);
  const session = identifyResponseSchema.parse(await response.json());
  userIds.add(session.userId);
  return session;
}

async function contactOf(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("kind, verified, external_id, name, email, org_id, org_name, audience, attributes")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

/** A guest who has written once, as the chat frame would leave them. */
async function guestWithConversation(body: string) {
  const guest = await newGuest();
  userIds.add(guest.id);
  const { data, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: guest.id,
    body,
    source: "web",
    contact_name: "Typed Name",
    contact_phone: "+81312345678",
  });
  if (error) throw error;
  return { guest, conversationId: data };
}

async function conversationsOf(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("contact_id", userId);
  if (error) throw error;
  return data.map((conversation) => conversation.id);
}

async function setMode(mode: "none" | "signed_token") {
  const { error } = await supabaseAdmin
    .from("settings")
    .upsert({ key: IDENTITY_SETTING, value: { mode } });
  if (error) throw error;
}

beforeAll(async () => {
  await setMode("signed_token");
  const { error } = await supabaseAdmin
    .from("secrets")
    .upsert({ key: IDENTITY_KEYS_SECRET, value: [key] });
  if (error) throw error;
});

afterAll(async () => {
  await supabaseAdmin.from("settings").delete().eq("key", IDENTITY_SETTING);
  await supabaseAdmin.from("secrets").delete().eq("key", IDENTITY_KEYS_SECRET);
  // Conversations first: a contact who still has one cannot be removed.
  const ids = [...userIds];
  await supabaseAdmin.from("conversations").delete().in("contact_id", ids);
  const removed = await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
  // A guest who was merged is already gone; anyone else must go now, or they are left in the
  // database every other test shares.
  const failed = removed.filter(({ error }) => error && error.status !== 404);
  if (failed.length > 0) throw new Error(`Left ${String(failed.length)} test users behind.`);
});

describe("POST /api/identify", () => {
  it("signs in the user a token is for, as a verified contact", async () => {
    const session = await signedIn({
      sub: `${run}:ada`,
      name: "Ada Obi",
      email: "ada@example.com",
      org: { id: "acme", name: "Acme" },
      audience: "business",
      attributes: { plan: "pro" },
    });

    await expect(supabaseAdmin.auth.getClaims(session.session?.accessToken)).resolves.toMatchObject(
      {
        data: { claims: { sub: session.userId, is_anonymous: false } },
      },
    );
    await expect(contactOf(session.userId)).resolves.toEqual({
      kind: "user",
      verified: true,
      external_id: `${run}:ada`,
      name: "Ada Obi",
      email: "ada@example.com",
      org_id: "acme",
      org_name: "Acme",
      audience: "business",
      attributes: { plan: "pro" },
    });
  });

  it("is the same contact on another device, with their details brought up to date", async () => {
    const phone = await signedIn({ sub: `${run}:ada`, name: "Ada Obi" });
    const laptop = await signedIn({ sub: `${run}:ada`, name: "Ada Obi-Mensah" });

    expect(laptop.userId).toBe(phone.userId);
    await expect(contactOf(laptop.userId)).resolves.toMatchObject({
      name: "Ada Obi-Mensah",
      org_id: null,
    });
  });

  it("gives a different user their own contact", async () => {
    const ada = await signedIn({ sub: `${run}:ada` });
    const ben = await signedIn({ sub: `${run}:ben` });
    expect(ben.userId).not.toBe(ada.userId);
  });

  it("gives a guest's conversations to the user they sign in as", async () => {
    const { guest, conversationId } = await guestWithConversation("I started as a guest");

    const session = await signedIn({ sub: `${run}:cleo`, name: "Cleo Park" }, guest);

    expect(session.mergedConversations).toBe(1);
    await expect(conversationsOf(session.userId)).resolves.toEqual([conversationId]);
    await expect(contactOf(session.userId)).resolves.toMatchObject({ name: "Cleo Park" });
    await expect(supabaseAdmin.auth.admin.getUserById(guest.id)).resolves.toMatchObject({
      data: { user: null },
    });
  });

  it("adds a second device's guest conversations to the ones the user already has", async () => {
    const first = await guestWithConversation("From my phone");
    const second = await guestWithConversation("From my laptop");

    await signedIn({ sub: `${run}:dele` }, first.guest);
    const session = await signedIn({ sub: `${run}:dele` }, second.guest);

    expect(session.mergedConversations).toBe(1);
    const conversations = await conversationsOf(session.userId);
    expect(conversations.sort()).toEqual([first.conversationId, second.conversationId].sort());
  });

  it("moves nothing when the session sent along is another user's", async () => {
    const { guest, conversationId } = await guestWithConversation("Mine, and staying mine");
    const eve = await signedIn({ sub: `${run}:eve` }, guest);

    const fay = await signedIn(
      { sub: `${run}:fay` },
      { headers: { authorization: `Bearer ${eve.session?.accessToken ?? ""}` } },
    );

    expect(fay.mergedConversations).toBe(0);
    await expect(conversationsOf(eve.userId)).resolves.toEqual([conversationId]);
    await expect(conversationsOf(fay.userId)).resolves.toEqual([]);
  });

  it("leaves a chat that is already signed in as the user with the session it has", async () => {
    const first = await signedIn({ sub: `${run}:gil`, name: "Gil" });
    const again = await signedIn(
      { sub: `${run}:gil`, name: "Gil Moreno" },
      { headers: { authorization: `Bearer ${first.session?.accessToken ?? ""}` } },
    );

    expect(first.session).not.toBeNull();
    expect(again).toEqual({ userId: first.userId, session: null, mergedConversations: 0 });
    await expect(contactOf(first.userId)).resolves.toMatchObject({ name: "Gil Moreno" });
  });

  it("turns away a session it cannot verify, so no history is left behind unnoticed", async () => {
    const response = await post(
      { token: await sign({ sub: `${run}:ada` }) },
      { authorization: "Bearer not-a-session" },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "unauthorized" } });
  });

  it("turns away a token signed with another secret", async () => {
    const token = await sign({ sub: `${run}:ada` }, "a".repeat(40));
    const response = await post({ token });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "token_rejected" } });
  });

  it("says when a token has expired", async () => {
    const token = await sign({ sub: `${run}:ada` }, key.secret, "-10m");
    const response = await post({ token });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "token_expired" } });
  });

  it("turns away a request with no token", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ token: "" })).status).toBe(400);
  });

  it("identifies nobody when the install is not set up to", async () => {
    await setMode("none");
    try {
      const response = await post({ token: await sign({ sub: `${run}:ada` }) });
      expect(response.status).toBe(403);
    } finally {
      await setMode("signed_token");
    }
  });
});

import { type SigningKey } from "@helpwren/adapters";
import { identifyResponseSchema } from "@helpwren/core";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as identify } from "@/app/api/identify/route";
import { IDENTITY_KEYS_SECRET, IDENTITY_SETTING } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function post(body: unknown) {
  return identify(
    new Request("http://localhost/api/identify", { method: "POST", body: JSON.stringify(body) }),
  );
}

async function signedIn(claims: Record<string, unknown>) {
  const response = await post({ token: await sign(claims) });
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
  await Promise.all([...userIds].map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
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

    await expect(supabaseAdmin.auth.getClaims(session.accessToken)).resolves.toMatchObject({
      data: { claims: { sub: session.userId, is_anonymous: false } },
    });
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

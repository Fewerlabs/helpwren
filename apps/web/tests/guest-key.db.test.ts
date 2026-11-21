import { guestCheckSchema } from "@helpwren/core";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";

import { POST as check } from "@/app/api/guest/check/route";
import { DELETE as forget, POST as link } from "@/app/api/guest/route";
import { guestCookieFor } from "@/lib/guest-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, removePeople, signInAgent, type Person } from "./support/people";

// The guest key routes, called directly against the local database. The tests run over plain
// HTTP, so the cookie is the one for local work.
const COOKIE = guestCookieFor("http://localhost").name;

// A request with no bearer session is checked for the team's session cookies, which none has.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));
const people: Person[] = [];

function request(
  path: string,
  { method = "POST", key, as, site }: { method?: string; key?: string; as?: Person; site?: string },
) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      ...(as?.headers ?? {}),
      ...(key ? { cookie: `${COOKIE}=${key}` } : {}),
      ...(site ? { "sec-fetch-site": site } : {}),
    },
  });
}

/** The key a response gave the browser, or "" when it took the key back. */
function keyFrom(response: Response): string | undefined {
  const set = response.headers.get("set-cookie") ?? "";
  return new RegExp(`${COOKIE}=([^;]*)`).exec(set)?.[1];
}

async function guest(): Promise<Person> {
  const person = await newGuest();
  people.push(person);
  return person;
}

async function restorable(key: string): Promise<boolean> {
  const response = await check(request("/api/guest/check", { key }));
  return guestCheckSchema.parse(await response.json()).restorable;
}

afterAll(async () => {
  await removePeople(people);
});

describe("the guest key", () => {
  it("is given to a guest's browser, in a cookie no script can read", async () => {
    const response = await link(request("/api/guest", { as: await guest(), site: "same-origin" }));
    expect(response.status).toBe(204);
    expect(keyFrom(response)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  });

  it("is given to nobody else", async () => {
    expect((await link(request("/api/guest", {}))).status).toBe(401);
    const agent = await signInAgent("sam@example.com");
    expect((await link(request("/api/guest", { as: agent }))).status).toBe(401);
  });

  it("cannot be used by a request another site started", async () => {
    const response = await link(request("/api/guest", { as: await guest(), site: "cross-site" }));
    expect(response.status).toBe(403);
    expect(
      (await check(request("/api/guest/check", { key: "x", site: "cross-site" }))).status,
    ).toBe(403);
  });

  it("brings a guest's conversation to the new guest of a browser that lost their session", async () => {
    const before = await guest();
    const { data: conversationId, error } = await supabaseAdmin.rpc("start_conversation", {
      contact_id: before.id,
      body: "Is my parcel lost?",
      source: "web",
      contact_name: "Noor",
      contact_email: `noor.${crypto.randomUUID()}@example.org`,
    });
    if (error) throw error;
    const key = keyFrom(await link(request("/api/guest", { as: before })));
    if (!key) throw new Error("No key was given.");
    expect(await restorable(key)).toBe(true);

    // The browser lost the session, and started a new guest.
    const after = await guest();
    const response = await link(request("/api/guest", { as: after, key }));
    expect(response.status).toBe(204);

    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("contact:contacts(id, name)")
      .eq("id", conversationId)
      .single();
    expect(conversation?.contact).toEqual({ id: after.id, name: "Noor" });
    // The old guest's sign-in is gone, and the old key with it; the new key is the new guest's.
    expect((await supabaseAdmin.auth.admin.getUserById(before.id)).data.user).toBeNull();
    expect(await restorable(key)).toBe(false);
    const renewed = keyFrom(response);
    expect(renewed && (await restorable(renewed))).toBe(true);
  });

  it("is taken back when it is no longer good, and given up on logging out", async () => {
    const response = await check(request("/api/guest/check", { key: "A".repeat(43) }));
    expect(guestCheckSchema.parse(await response.json())).toEqual({ restorable: false });
    expect(keyFrom(response)).toBe("");

    const key = keyFrom(await link(request("/api/guest", { as: await guest() })));
    if (!key) throw new Error("No key was given.");
    const forgotten = await forget(request("/api/guest", { method: "DELETE", key }));
    expect(keyFrom(forgotten)).toBe("");
    expect(await restorable(key)).toBe(false);
  });
});

describe("guestCookieFor", () => {
  it("over HTTPS, is sent from a frame on another site, kept apart for each, and bound to the host", () => {
    expect(guestCookieFor("https://support.example.com")).toMatchObject({
      name: "__Host-helpwren-guest",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
        path: "/",
      },
    });
  });

  it("over plain HTTP, stays on the site", () => {
    expect(guestCookieFor("http://localhost:3000").options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
    });
  });
});

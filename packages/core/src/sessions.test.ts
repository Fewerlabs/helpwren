import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createApi } from "./api";
import { HelpwrenError } from "./errors";
import { createSessions } from "./sessions";
import { type HelpwrenSupabaseClient } from "./supabase";

interface Claims {
  sub: string;
  is_anonymous: boolean;
}
interface ClaimsResult {
  data: { claims: Claims } | null;
  error: Error | null;
}

const GUEST: Claims = { sub: "guest-1", is_anonymous: true };
const NEW_GUEST_ID = "guest-2";

/** A stand-in for Supabase Auth: what `getClaims` answers in turn, and what was asked of it. */
function auth(answers: ClaimsResult[], userError: Error | null = null) {
  const getUser = vi.fn(() => Promise.resolve({ data: { user: null }, error: userError }));
  const getClaims = vi.fn(() => Promise.resolve(answers.shift() ?? { data: null, error: null }));
  const signInAnonymously = vi.fn(() =>
    Promise.resolve({ data: { user: { id: NEW_GUEST_ID } }, error: null }),
  );
  const signOut = vi.fn(() => Promise.resolve({ error: null }));
  const supabase = {
    auth: {
      getClaims,
      getUser,
      signInAnonymously,
      signOut,
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  } as unknown as HelpwrenSupabaseClient;
  return { supabase, getClaims, getUser, signInAnonymously, signOut };
}

/** The Helpwren API, answering each path as told and keeping a list of what was called. */
function server(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    calls.push(`${init?.method ?? "GET"} ${path}`);
    const route = routes[`${init?.method ?? "GET"} ${path}`];
    return route ? Promise.resolve(route()) : Promise.reject(new TypeError("Load failed"));
  });
  return { fetch, calls };
}

function sessionsWith(fake: ReturnType<typeof auth>, api: ReturnType<typeof server>) {
  return createSessions(
    fake.supabase,
    createApi(fake.supabase, { apiUrl: "https://support.example.com", fetch: api.fetch }),
  );
}

const noContent = () => new Response(null, { status: 204 });
const json = (body: unknown) => () => Response.json(body);
const offline = { data: null, error: new AuthRetryableFetchError("Load failed", 0) };
const refused = { data: null, error: new AuthApiError("Invalid Refresh Token", 400, undefined) };
const signedIn = (claims: Claims) => ({ data: { claims }, error: null });

describe("sessions.current", () => {
  it("throws when the session cannot be checked, rather than saying there is none", async () => {
    const sessions = sessionsWith(auth([offline]), server({}));
    await expect(sessions.current()).rejects.toBeInstanceOf(HelpwrenError);
  });

  it("says there is none when Supabase Auth refused it", async () => {
    const sessions = sessionsWith(auth([refused]), server({}));
    await expect(sessions.current()).resolves.toBeNull();
  });
});

describe("sessions.startGuest", () => {
  it("never starts a guest in place of a session it could not check", async () => {
    const fake = auth([offline]);
    const sessions = sessionsWith(fake, server({}));

    await expect(sessions.startGuest()).rejects.toBeInstanceOf(HelpwrenError);
    expect(fake.signInAnonymously).not.toHaveBeenCalled();
  });

  it("starts a guest when there is none, and gives the browser its key", async () => {
    const fake = auth([]);
    const api = server({ "POST /api/guest": noContent });

    await expect(sessionsWith(fake, api).startGuest()).resolves.toEqual({
      id: NEW_GUEST_ID,
      isGuest: true,
    });
    expect(api.calls).toEqual(["POST /api/guest"]);
  });

  it("still starts the guest when the key cannot be given", async () => {
    const fake = auth([]);
    await expect(sessionsWith(fake, server({})).startGuest()).resolves.toMatchObject({
      id: NEW_GUEST_ID,
    });
  });
});

describe("sessions.resume", () => {
  it("keeps a guest's session, and renews the browser's key", async () => {
    const fake = auth([signedIn(GUEST)]);
    const api = server({ "POST /api/guest": noContent });

    await expect(sessionsWith(fake, api).resume()).resolves.toEqual({
      id: GUEST.sub,
      isGuest: true,
    });
    expect(api.calls).toEqual(["POST /api/guest"]);
    expect(fake.signInAnonymously).not.toHaveBeenCalled();
  });

  it("starts no guest for a visitor who has never written", async () => {
    const fake = auth([]);
    const api = server({ "POST /api/guest/check": json({ restorable: false }) });

    await expect(sessionsWith(fake, api).resume()).resolves.toBeNull();
    expect(fake.signInAnonymously).not.toHaveBeenCalled();
  });

  it("brings back a guest whose session the browser lost but whose key it kept", async () => {
    const fake = auth([]);
    const api = server({
      "POST /api/guest/check": json({ restorable: true }),
      "POST /api/guest": noContent,
    });

    await expect(sessionsWith(fake, api).resume()).resolves.toEqual({
      id: NEW_GUEST_ID,
      isGuest: true,
    });
    // The new guest is tied to the key, which moves the old guest's conversations to them.
    expect(api.calls).toEqual(["POST /api/guest/check", "POST /api/guest"]);
  });

  it("throws, to be asked again, when it cannot tell whether there is a guest to bring back", async () => {
    const fake = auth([]);
    await expect(sessionsWith(fake, server({})).resume()).rejects.toBeInstanceOf(HelpwrenError);
    expect(fake.signInAnonymously).not.toHaveBeenCalled();
  });
});

describe("sessions.reset", () => {
  it("gives up the browser's key and signs out", async () => {
    const fake = auth([]);
    const api = server({ "DELETE /api/guest": noContent });

    await sessionsWith(fake, api).reset();
    expect(api.calls).toEqual(["DELETE /api/guest"]);
    expect(fake.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("signs out even when the key could not be given up, and says so", async () => {
    const fake = auth([]);
    await expect(sessionsWith(fake, server({})).reset()).rejects.toBeInstanceOf(HelpwrenError);
    expect(fake.signOut).toHaveBeenCalled();
  });

  it("starts a new guest when the install deleted the one the session names", async () => {
    const gone = new AuthApiError(
      "User from sub claim in JWT does not exist",
      403,
      "user_not_found",
    );
    const fake = auth([{ data: { claims: GUEST }, error: null }], gone);
    const api = server({ "POST /api/guest": noContent });

    const session = await sessionsWith(fake, api).startGuest();

    expect(fake.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(session).toEqual({ id: NEW_GUEST_ID, isGuest: true });
  });

  it("keeps the guest when the server cannot be reached to ask", async () => {
    const fake = auth([{ data: { claims: GUEST }, error: null }]);
    fake.getUser.mockRejectedValueOnce(new TypeError("Load failed"));
    const api = server({ "POST /api/guest": noContent });

    const session = await sessionsWith(fake, api).startGuest();

    expect(fake.signOut).not.toHaveBeenCalled();
    expect(session).toEqual({ id: GUEST.sub, isGuest: true });
  });
});

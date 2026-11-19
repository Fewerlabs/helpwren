import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createApi } from "./api";
import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

// Only the session is read from Supabase here, so that is all this stand-in provides.
function supabaseWith(token: string | null) {
  return {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: token ? { access_token: token } : null } }),
    },
  } as unknown as HelpwrenSupabaseClient;
}

function answering(status: number, body?: unknown) {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

const schema = z.object({ id: z.string() });

describe("createApi", () => {
  it("posts JSON to the app with the session as a bearer token", async () => {
    const fetch = answering(201, { id: "c1" });
    const api = createApi(supabaseWith("token-123"), {
      apiUrl: "https://support.example.com/",
      fetch,
    });

    await expect(api.post("/api/things", { name: "Ada" }, schema)).resolves.toEqual({
      ok: true,
      data: { id: "c1" },
    });
    expect(fetch).toHaveBeenCalledWith("https://support.example.com/api/things", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer token-123" },
      body: '{"name":"Ada"}',
    });
  });

  it("calls this origin and sends no token when there is neither", async () => {
    const fetch = answering(204);
    await createApi(supabaseWith(null), { fetch }).post("/api/things", undefined, z.undefined());

    expect(fetch).toHaveBeenCalledWith("/api/things", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  });

  it("deletes with the session as a bearer token", async () => {
    const fetch = answering(200, { id: "c1" });
    await createApi(supabaseWith("token-123"), { fetch }).delete("/api/things/c1", schema);

    expect(fetch).toHaveBeenCalledWith("/api/things/c1", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: "Bearer token-123" },
      body: "{}",
    });
  });

  it("returns a failure the server sent on purpose", async () => {
    const fetch = answering(429, { error: { code: "rate_limited", message: "Slow down." } });
    const api = createApi(supabaseWith("t"), { fetch });

    await expect(api.post("/api/things", {}, schema)).resolves.toEqual({
      ok: false,
      code: "rate_limited",
      message: "Slow down.",
    });
  });

  it.each([
    ["a failure in no known shape", answering(500, "Internal Server Error")],
    ["a success in the wrong shape", answering(200, { nope: true })],
    [
      "a network failure",
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Failed to fetch"))),
    ],
  ])("throws on %s", async (_, fetch) => {
    const api = createApi(supabaseWith("t"), { fetch });
    await expect(api.post("/api/things", {}, schema)).rejects.toThrow(HelpwrenError);
  });
});

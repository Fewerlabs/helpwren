import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { selfHostedSecrets, supabaseRoleKey } from "./secrets.ts";

describe("supabaseRoleKey", () => {
  it("is a JWT for the role, signed with the secret", () => {
    const key = supabaseRoleKey("anon", "a-secret", new Date("2026-01-01T00:00:00Z"));
    const [header = "", payload = "", signature = ""] = key.split(".");
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toMatchObject({
      role: "anon",
      iss: "supabase",
      iat: 1767225600,
    });
    const expected = createHmac("sha256", "a-secret").update(`${header}.${payload}`).digest();
    expect(signature).toBe(expected.toString("base64url"));
  });
});

describe("selfHostedSecrets", () => {
  it("makes different secrets each time, with keys signed by its own JWT secret", () => {
    const first = selfHostedSecrets();
    const second = selfHostedSecrets();
    expect(first.POSTGRES_PASSWORD).not.toBe(second.POSTGRES_PASSWORD);
    expect(first.POSTGRES_PASSWORD).toMatch(/^[0-9a-f]{32}$/);
    const [header, payload, signature] = (first.SERVICE_ROLE_KEY ?? "").split(".");
    const expected = createHmac("sha256", first.JWT_SECRET ?? "")
      .update(`${header}.${payload}`)
      .digest("base64url");
    expect(signature).toBe(expected);
  });
});

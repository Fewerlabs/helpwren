import { afterAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local database and its demo data (supabase/seed.sql), where Ada is an
// admin and Sam is an agent.
async function signedIn(email: string) {
  const client = createHelpwrenClient({ supabase: browserClient() });
  const result = await client.auth.verifyLoginCode(email, await issueLoginCode(email));
  if (!result.ok) throw new Error(`Could not sign in as ${email}.`);
  return client;
}

async function storedValue(key: string) {
  const { data } = await serverClient()
    .from("settings")
    .select("value, is_public")
    .eq("key", key)
    .maybeSingle();
  return data;
}

afterAll(async () => {
  const admin = serverClient();
  await admin.from("settings").delete().eq("key", "allowed_domains");
  await admin
    .from("settings")
    .update({ value: { name: "Helpwren Demo" } })
    .eq("key", "brand");
  await admin.from("settings").update({ value: "email_or_phone" }).eq("key", "guest_details");
});

describe("settings.getAll", () => {
  it("gives a team member every setting", async () => {
    const client = await signedIn("sam@example.com");
    await expect(client.settings.getAll()).resolves.toMatchObject({
      brand: { name: "Helpwren Demo" },
      guestDetails: "email_or_phone",
      sources: ["web", "web_app"],
    });
  });

  it("gives a visitor defaults in place of anything that is not public", async () => {
    const visitor = createHelpwrenClient({ supabase: browserClient() });
    await expect(visitor.settings.getAll()).resolves.toMatchObject({
      brand: { name: "Helpwren Demo" },
      sources: ["web"],
    });
  });
});

describe("settings.update", () => {
  it("lets an admin change settings, storing each where visitors may or may not read it", async () => {
    const client = await signedIn("ada@example.com");

    await expect(
      client.settings.update({
        brand: { name: "  Acme Support " },
        guestDetails: "phone",
        allowedDomains: ["Example.com", "*.example.org"],
      }),
    ).resolves.toEqual({ ok: true });

    await expect(client.settings.getAll()).resolves.toMatchObject({
      brand: { name: "Acme Support" },
      guestDetails: "phone",
      allowedDomains: ["example.com", "*.example.org"],
    });
    expect(await storedValue("brand")).toMatchObject({ is_public: true });
    expect(await storedValue("allowed_domains")).toMatchObject({ is_public: false });
  });

  it("changes only what it is given", async () => {
    const client = await signedIn("ada@example.com");
    await client.settings.update({ brand: { name: "First" }, guestDetails: "none" });
    await client.settings.update({ brand: { name: "Second" } });

    await expect(client.settings.getAll()).resolves.toMatchObject({
      brand: { name: "Second" },
      guestDetails: "none",
    });
  });

  it("refuses an agent who is not an admin, and changes nothing", async () => {
    const before = await storedValue("brand");
    const client = await signedIn("sam@example.com");

    await expect(client.settings.update({ brand: { name: "Hijacked" } })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await storedValue("brand")).toEqual(before);
  });

  it("refuses a visitor", async () => {
    const visitor = createHelpwrenClient({ supabase: browserClient() });
    await expect(visitor.settings.update({ brand: { name: "Hijacked" } })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it.each([
    ["an empty brand name", { brand: { name: "  " } }],
    ["a domain with a path", { allowedDomains: ["example.com/page"] }],
  ])("rejects %s before it reaches the database", async (_, patch) => {
    const client = await signedIn("ada@example.com");
    await expect(client.settings.update(patch)).rejects.toThrow();
  });
});

describe("agents.list", () => {
  it("gives a team member the whole team, by name", async () => {
    const client = await signedIn("sam@example.com");
    const team = await client.agents.list();

    expect(team.map((member) => member.name)).toEqual(["Ada Okafor", "Sam Rivera"]);
    expect(team[0]).toMatchObject({ email: "ada@example.com", role: "admin", active: true });
  });

  it("gives a visitor nobody", async () => {
    const visitor = createHelpwrenClient({ supabase: browserClient() });
    await expect(visitor.agents.list()).rejects.toThrow();
  });
});

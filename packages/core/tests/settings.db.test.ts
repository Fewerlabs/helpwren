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
  await admin
    .from("settings")
    .delete()
    .in("key", ["allowed_domains", "widget", "chat_page", "help_center"]);
  const sam = "a0000000-0000-4000-8000-000000000002";
  const { data: photos } = await admin.storage.from("avatars").list(sam);
  if (photos?.length) {
    await admin.storage.from("avatars").remove(photos.map((photo) => `${sam}/${photo.name}`));
  }
  const { data: logos } = await admin.storage.from("brand").list();
  if (logos?.length) await admin.storage.from("brand").remove(logos.map((logo) => logo.name));
  await admin
    .from("settings")
    .update({ value: { name: "Helpwren Demo" } })
    .eq("key", "brand");
  await admin.from("settings").update({ value: "email_or_phone" }).eq("key", "guest_details");
});

const newVisitor = () => createHelpwrenClient({ supabase: browserClient() });

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

describe("branding", () => {
  // The smallest PNG there is: one transparent pixel.
  const pixel = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    ),
    (character) => character.charCodeAt(0),
  );
  const png = () => new Blob([pixel], { type: "image/png" });

  it("lets an admin upload a logo that anyone can then load", async () => {
    const client = await signedIn("ada@example.com");
    const result = await client.settings.uploadLogo(png());
    if (!result.ok) throw new Error(`The upload was refused: ${result.reason}`);

    const loaded = await fetch(result.url);
    expect(loaded.status).toBe(200);
    expect(loaded.headers.get("content-type")).toBe("image/png");

    await client.settings.update({ brand: { name: "Acme", logo: result.url, accent: "#1D4ED8" } });
    await expect(newVisitor().settings.getPublic()).resolves.toMatchObject({
      brand: { name: "Acme", logo: result.url, accent: "#1d4ed8" },
    });
  });

  it("refuses a logo from anyone else, and one that is not an image or is too large", async () => {
    const agent = await signedIn("sam@example.com");
    await expect(agent.settings.uploadLogo(png())).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });

    const admin = await signedIn("ada@example.com");
    await expect(
      admin.settings.uploadLogo(new Blob(["<svg/>"], { type: "image/svg+xml" })),
    ).resolves.toEqual({ ok: false, reason: "unsupported" });
    await expect(
      admin.settings.uploadLogo(new Blob([new Uint8Array(1024 * 1024 + 1)], { type: "image/png" })),
    ).resolves.toEqual({ ok: false, reason: "too_large" });
  });

  it("lets a team member store a photo of their own, and nobody a visitor's", async () => {
    const agent = await signedIn("sam@example.com");
    const stored = await agent.agents.uploadPhoto(png());
    if (!stored.ok) throw new Error(`The upload was refused: ${stored.reason}`);
    expect(stored.url).toContain("/storage/v1/object/public/avatars/");
    expect((await fetch(stored.url)).status).toBe(200);

    await expect(newVisitor().agents.uploadPhoto(png())).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("saves how the widget, the chat page and the help center wear the brand", async () => {
    const client = await signedIn("ada@example.com");
    await client.settings.update({
      widget: {
        position: "left",
        offsetX: 32,
        offsetY: 24,
        launcher: "logo",
        welcome: "  Hello!  ",
        quickReplies: ["Pricing", "Track my order"],
      },
      chatPage: { title: "Talk to Acme" },
      helpCenter: {
        headerStyle: "plain",
        headerLinks: [{ label: " Back to Acme ", url: "https://acme.example" }],
        footerLinks: [{ label: "Privacy", url: "/privacy" }],
        showChat: false,
        searchPlaceholder: "Search Acme help",
        url: "https://acme.example/help/",
      },
    });

    // All of it is public: the chat reads it with no session.
    await expect(newVisitor().settings.getPublic()).resolves.toMatchObject({
      widget: {
        position: "left",
        offsetX: 32,
        offsetY: 24,
        launcher: "logo",
        welcome: "Hello!",
        quickReplies: ["Pricing", "Track my order"],
      },
      chatPage: { title: "Talk to Acme" },
      helpCenter: {
        headerStyle: "plain",
        headerLinks: [{ label: "Back to Acme", url: "https://acme.example" }],
        footerLinks: [{ label: "Privacy", url: "/privacy" }],
        showChat: false,
        searchPlaceholder: "Search Acme help",
        // Paths are joined to it, so the slash at the end is dropped.
        url: "https://acme.example/help",
      },
    });
  });
});

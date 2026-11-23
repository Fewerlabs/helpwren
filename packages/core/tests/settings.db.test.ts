import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, serverClient } from "./support/local-supabase";
import { keepSettings, newAgent, removeAccounts, runMarker, signIn } from "./support/test-data";

// These run against the shared local database, where Ada (from the demo data) is an admin and
// Sam an agent. Settings are one per install, so these tests set the ones they read, and put
// back afterwards whatever was there before; files they upload are removed.
const run = runMarker();
const BRAND = `Demo ${run}`;
const TOUCHED = ["brand", "guest_details", "allowed_domains", "widget", "chat_page", "help_center"];
let restoreSettings: () => Promise<void> = () => Promise.resolve();
const uploaded: { bucket: string; path: string }[] = [];
const madeAgents: string[] = [];

async function signedIn(email: string) {
  return (await signIn(email)).client;
}

async function storedValue(key: string) {
  const { data } = await serverClient()
    .from("settings")
    .select("value, is_public")
    .eq("key", key)
    .maybeSingle();
  return data;
}

/** Remembers a file uploaded by its public address, to remove it after. */
function rememberUpload(url: string) {
  const [bucket = "", ...path] = url.split("/storage/v1/object/public/")[1]?.split("/") ?? [];
  uploaded.push({ bucket, path: path.join("/") });
}

beforeAll(async () => {
  restoreSettings = await keepSettings(TOUCHED);
  const { error } = await serverClient()
    .from("settings")
    .upsert([
      { key: "brand", value: { name: BRAND }, is_public: true },
      { key: "guest_details", value: "email_or_phone", is_public: true },
      { key: "allowed_domains", value: ["example.com"], is_public: false },
    ]);
  if (error) throw error;
});

afterAll(async () => {
  const admin = serverClient();
  for (const { bucket, path } of uploaded) await admin.storage.from(bucket).remove([path]);
  await restoreSettings();
  await removeAccounts(madeAgents);
});

const newVisitor = () => createHelpwrenClient({ supabase: browserClient() });

describe("settings.getAll", () => {
  it("gives a team member every setting", async () => {
    const client = await signedIn("sam@example.com");
    await expect(client.settings.getAll()).resolves.toMatchObject({
      brand: { name: BRAND },
      guestDetails: "email_or_phone",
      allowedDomains: ["example.com"],
    });
  });

  it("gives a visitor defaults in place of anything that is not public", async () => {
    const visitor = createHelpwrenClient({ supabase: browserClient() });
    await expect(visitor.settings.getAll()).resolves.toMatchObject({
      brand: { name: BRAND },
      allowedDomains: [],
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
    // Two more, whose names sort before and after the demo's.
    const first = await newAgent(`Aaron ${run}`, "admin");
    const last = await newAgent(`Zoe ${run}`);
    madeAgents.push(first.id, last.id);

    const client = await signedIn("sam@example.com");
    const team = await client.agents.list();

    // Others may have joined the team too; these four must come in this order among them.
    const known = [first.name, "Ada Okafor", "Sam Rivera", last.name];
    expect(team.map((member) => member.name).filter((name) => known.includes(name))).toEqual(known);
    expect(team.find((member) => member.name === "Ada Okafor")).toMatchObject({
      email: "ada@example.com",
      role: "admin",
      active: true,
    });
    expect(team.find((member) => member.id === last.id)).toMatchObject({
      email: last.email,
      role: "agent",
      active: true,
    });
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
    rememberUpload(result.url);

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
    rememberUpload(stored.url);
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
      chatPage: {
        title: "Talk to Acme",
        headerStyle: "image",
        headerImage: "https://cdn.example/chat.jpg",
      },
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
      chatPage: {
        title: "Talk to Acme",
        headerStyle: "image",
        headerImage: "https://cdn.example/chat.jpg",
      },
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

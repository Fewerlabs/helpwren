import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, serverClient } from "./support/local-supabase";
import { newAccount, removeAccounts, runMarker, signIn, uniqueEmail } from "./support/test-data";

// These run against the shared local database, which may hold anyone's contacts. Each test
// looks only at the contacts made here, whose names and emails carry this run's marker.
const run = runMarker();
const MINUTE = 60_000;

interface Made {
  kind: "guest" | "user";
  name: string | null;
  email: string;
  verified?: boolean;
  org?: string;
  /** How long ago they last wrote. Left out, they never have. */
  wroteAgo?: number;
  /** Seen browsing a moment ago, on a tablet in Iceland. */
  seenNow?: boolean;
  /** What they wrote. */
  says?: string;
}

// Shaped like the demo data: a guest with no name, a guest with details, two verified users at
// one company, and one guest who has never written.
const PEOPLE = {
  anonymous: { kind: "guest", name: null, email: `anon.${run}@example.test`, wroteAgo: 4 * MINUTE },
  priya: {
    kind: "guest",
    name: `Priya ${run}`,
    email: `priya.${run}@example.org`,
    wroteAgo: 120 * MINUTE,
  },
  jonas: {
    kind: "user",
    name: `Jonas ${run}`,
    email: `jonas.${run}@northwind.example`,
    verified: true,
    org: `Northwind ${run}`,
    wroteAgo: 20 * MINUTE,
    says: `The billing address on ${run} is wrong.`,
  },
  mei: {
    kind: "user",
    name: `Mei ${run}`,
    email: `mei.${run}@northwind.example`,
    verified: true,
    org: `Northwind ${run}`,
    wroteAgo: 3 * 24 * 60 * MINUTE,
    seenNow: true,
  },
  quiet: { kind: "guest", name: `Quiet ${run}`, email: `quiet.${run}@example.test` },
} satisfies Record<string, Made>;

const ids: Record<keyof typeof PEOPLE, string> = {
  anonymous: "",
  priya: "",
  jonas: "",
  mei: "",
  quiet: "",
};

async function make(key: keyof typeof PEOPLE) {
  const person: Made = PEOPLE[key];
  const admin = serverClient();
  const id = await newAccount(uniqueEmail(key));
  ids[key] = id;

  const { error } = await admin.from("contacts").insert({
    id,
    kind: person.kind,
    verified: person.verified ?? false,
    name: person.name,
    email: person.email,
    org_id: person.org ?? null,
    org_name: person.org ?? null,
    ...(person.seenNow
      ? { last_seen_at: new Date().toISOString(), device: "tablet", country: "IS" }
      : {}),
  });
  if (error) throw error;
  if (person.wroteAgo === undefined) return;

  const at = new Date(Date.now() - person.wroteAgo).toISOString();
  const conversation = await admin
    .from("conversations")
    .insert({ contact_id: id, source: "web" })
    .select("id")
    .single();
  if (conversation.error) throw conversation.error;
  const message = await admin.from("messages").insert({
    conversation_id: conversation.data.id,
    sender_id: id,
    sender_role: person.kind,
    body: person.says ?? "Hello",
    created_at: at,
  });
  if (message.error) throw message.error;
  // Sending stamps the conversation with the present; set the time it should have instead.
  await admin.from("conversations").update({ last_message_at: at }).eq("id", conversation.data.id);
}

beforeAll(async () => {
  await Promise.all(Object.keys(PEOPLE).map((key) => make(key as keyof typeof PEOPLE)));
});

afterAll(async () => {
  await removeAccounts(Object.values(ids).filter(Boolean));
});

async function signedInAgent() {
  return (await signIn("sam@example.com")).client;
}

const names = (page: { items: { name: string | null }[] }) => page.items.map((item) => item.name);

describe("contacts.list", () => {
  it("gives a team member everyone, most recently active first, with their activity", async () => {
    const client = await signedInAgent();
    const everyone = await client.contacts.list({ pageSize: 100 });
    expect(everyone.total).toBeGreaterThanOrEqual(5);

    const { items, total } = await client.contacts.list({ search: run });
    expect(total).toBe(5);
    expect(items.map((item) => item.id)).toEqual([
      ids.anonymous,
      ids.jonas,
      ids.priya,
      ids.mei,
      // Never written, so never active: last.
      ids.quiet,
    ]);
    expect(items[0]).toMatchObject({ name: null, kind: "guest", conversationCount: 1 });
    expect(items[3]).toMatchObject({
      name: `Mei ${run}`,
      kind: "user",
      verified: true,
      organisation: `Northwind ${run}`,
    });
    expect(items[4]).toMatchObject({ conversationCount: 0, lastActiveAt: null });
    expect(items.slice(0, 4).every((item) => item.lastActiveAt !== null)).toBe(true);
  });

  it("filters by guest or user", async () => {
    const client = await signedInAgent();
    const guests = await client.contacts.list({ kind: "guest", search: run });
    const users = await client.contacts.list({ kind: "user", search: run });

    expect(guests.total).toBe(3);
    expect(guests.items.every((item) => item.kind === "guest")).toBe(true);
    expect(names(users).sort()).toEqual([`Jonas ${run}`, `Mei ${run}`]);
  });

  it("filters by whether they are verified and have written", async () => {
    const client = await signedInAgent();
    const verified = await client.contacts.list({ verified: true, search: run });
    expect(names(verified).sort()).toEqual([`Jonas ${run}`, `Mei ${run}`]);
    await expect(client.contacts.list({ verified: false, search: run })).resolves.toMatchObject({
      total: 3,
    });
    const silent = await client.contacts.list({ conversations: "none", search: run });
    expect(names(silent)).toEqual([`Quiet ${run}`]);
    const written = await client.contacts.list({ conversations: "some", search: run });
    expect(written.total).toBe(4);
  });

  it("filters by when they were last seen, where, and on what, alongside a search", async () => {
    const client = await signedInAgent();
    // Both filters must hold at once.
    const never = await client.contacts.list({ seen: ["never"], search: `Jonas ${run}` });
    expect(names(never)).toEqual([`Jonas ${run}`]);
    await expect(
      client.contacts.list({ seen: ["never"], search: `Mei ${run}` }),
    ).resolves.toMatchObject({ total: 0 });

    const onTablets = await client.contacts.list({
      seen: ["day"],
      devices: ["tablet"],
      search: run,
    });
    expect(names(onTablets)).toEqual([`Mei ${run}`]);
    await expect(
      client.contacts.list({ seen: ["day"], devices: ["mobile"], search: run }),
    ).resolves.toMatchObject({ total: 0 });
    const inIceland = await client.contacts.list({ countries: ["IS"], search: run });
    expect(names(inIceland)).toEqual([`Mei ${run}`]);
    await expect(client.contacts.countries()).resolves.toContain("IS");
  });

  it.each([
    ["a name", `jonas ${run}`, [`Jonas ${run}`]],
    ["part of an email address", `${run}@example.org`, [`Priya ${run}`]],
    ["nothing that matches", `zzzz ${run}`, []],
  ])("searches by %s", async (_, search, expected) => {
    const client = await signedInAgent();
    const { items, total } = await client.contacts.list({ search });
    expect(items.map((item) => item.name)).toEqual(expected);
    expect(total).toBe(expected.length);
  });

  it("treats filter syntax in a search as plain text", async () => {
    const client = await signedInAgent();
    await expect(
      client.contacts.list({ search: `jonas ${run}),kind.eq.guest,(` }),
    ).resolves.toMatchObject({ total: 0 });
  });

  it("pages through the list", async () => {
    const client = await signedInAgent();
    const first = await client.contacts.list({ pageSize: 3, search: run });
    const second = await client.contacts.list({ pageSize: 3, page: 2, search: run });

    expect(first.items).toHaveLength(3);
    expect(second.items).toHaveLength(2);
    expect(second.total).toBe(5);
    const seen = [...first.items, ...second.items].map((item) => item.id);
    expect(new Set(seen).size).toBe(5);
  });

  it("gives a visitor nobody", async () => {
    const visitor = createHelpwrenClient({ supabase: browserClient() });
    await expect(visitor.contacts.list()).rejects.toThrow();
  });
});

describe("contacts.get and countByKind", () => {
  it("loads one contact, and counts each kind", async () => {
    const client = await signedInAgent();

    await expect(client.contacts.get(ids.priya)).resolves.toMatchObject({
      name: `Priya ${run}`,
      email: `priya.${run}@example.org`,
    });
    await expect(client.contacts.get("00000000-0000-4000-8000-000000000000")).resolves.toBeNull();

    // Others may be adding contacts at the same time, so the counts can only be checked against
    // what is known to be there: the ones made here.
    const counts = await client.contacts.countByKind();
    expect(Object.keys(counts).sort()).toEqual(["guest", "user"]);
    expect(counts.guest).toBeGreaterThanOrEqual(3);
    expect(counts.user).toBeGreaterThanOrEqual(2);
  });

  it("lists one contact's conversations", async () => {
    const client = await signedInAgent();
    const conversations = await client.conversations.list({ contactId: ids.jonas });

    expect(conversations.items).toHaveLength(1);
    expect(conversations.items[0]?.contact.name).toBe(`Jonas ${run}`);
  });
});

describe("conversations.search", () => {
  it("finds conversations by what was said, and by who they are with", async () => {
    const client = await signedInAgent();

    const byMessage = await client.conversations.search(`billing address on ${run}`);
    expect(byMessage.map((item) => item.contact.name)).toEqual([`Jonas ${run}`]);

    const byContact = await client.conversations.search(`priya ${run}`);
    expect(byContact.map((item) => item.contact.name)).toEqual([`Priya ${run}`]);

    await expect(client.conversations.search(`no such words ${run}`)).resolves.toEqual([]);
  });
});

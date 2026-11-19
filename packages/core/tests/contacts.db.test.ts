import { describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, issueLoginCode } from "./support/local-supabase";

// These run against the local database and its demo data (supabase/seed.sql): two guests, one
// of them with no details, and two verified users at Northwind Studio.
async function signedInAgent() {
  const client = createHelpwrenClient({ supabase: browserClient() });
  const result = await client.auth.verifyLoginCode(
    "sam@example.com",
    await issueLoginCode("sam@example.com"),
  );
  if (!result.ok) throw new Error("Could not sign in.");
  return client;
}

describe("contacts.list", () => {
  it("gives a team member everyone, most recently active first, with their activity", async () => {
    const client = await signedInAgent();
    const { items, total } = await client.contacts.list();

    expect(total).toBe(4);
    expect(items[0]).toMatchObject({ name: null, kind: "guest", conversationCount: 1 });
    expect(items.at(-1)).toMatchObject({
      name: "Mei Tanaka",
      kind: "user",
      verified: true,
      organisation: "Northwind Studio",
    });
    expect(items.every((item) => item.lastActiveAt !== null)).toBe(true);
  });

  it("filters by guest or user", async () => {
    const client = await signedInAgent();
    const guests = await client.contacts.list({ kind: "guest" });
    const users = await client.contacts.list({ kind: "user" });

    expect(guests.total).toBe(2);
    expect(users.items.map((item) => item.name).sort()).toEqual(["Jonas Berg", "Mei Tanaka"]);
  });

  it("filters by whether they are verified and have written", async () => {
    const client = await signedInAgent();
    const verified = await client.contacts.list({ verified: true });
    expect(verified.items.map((item) => item.name).sort()).toEqual(["Jonas Berg", "Mei Tanaka"]);
    await expect(client.contacts.list({ verified: false })).resolves.toMatchObject({ total: 2 });
    await expect(client.contacts.list({ conversations: "none" })).resolves.toMatchObject({
      total: 0,
    });
  });

  it("filters by when they were last seen, alongside a search", async () => {
    const client = await signedInAgent();
    // The demo contacts have never been seen browsing, and both filters must hold at once.
    const never = await client.contacts.list({ seen: ["never"], search: "jonas" });
    expect(never.items.map((item) => item.name)).toEqual(["Jonas Berg"]);
    await expect(
      client.contacts.list({ seen: ["day"], devices: ["tablet"] }),
    ).resolves.toMatchObject({ total: 0 });
    await expect(client.contacts.countries()).resolves.toBeInstanceOf(Array);
  });

  it.each([
    ["a name", "jonas", ["Jonas Berg"]],
    ["part of an email address", "example.org", ["Priya Nair"]],
    ["nothing that matches", "zzzz", []],
  ])("searches by %s", async (_, search, expected) => {
    const client = await signedInAgent();
    const { items, total } = await client.contacts.list({ search });
    expect(items.map((item) => item.name)).toEqual(expected);
    expect(total).toBe(expected.length);
  });

  it("treats filter syntax in a search as plain text", async () => {
    const client = await signedInAgent();
    await expect(client.contacts.list({ search: "jonas),kind.eq.guest,(" })).resolves.toMatchObject(
      {
        total: 0,
      },
    );
  });

  it("pages through the list", async () => {
    const client = await signedInAgent();
    const first = await client.contacts.list({ pageSize: 3 });
    const second = await client.contacts.list({ pageSize: 3, page: 2 });

    expect(first.items).toHaveLength(3);
    expect(second.items).toHaveLength(1);
    expect(second.total).toBe(4);
  });

  it("gives a visitor nobody", async () => {
    const visitor = createHelpwrenClient({ supabase: browserClient() });
    await expect(visitor.contacts.list()).rejects.toThrow();
  });
});

describe("contacts.get and countByKind", () => {
  it("loads one contact, and counts each kind", async () => {
    const client = await signedInAgent();
    const { items } = await client.contacts.list({ search: "priya" });
    const id = items[0]?.id ?? "";

    await expect(client.contacts.get(id)).resolves.toMatchObject({ name: "Priya Nair" });
    await expect(client.contacts.get("00000000-0000-4000-8000-000000000000")).resolves.toBeNull();
    await expect(client.contacts.countByKind()).resolves.toEqual({ guest: 2, user: 2 });
  });

  it("lists one contact's conversations", async () => {
    const client = await signedInAgent();
    const { items } = await client.contacts.list({ search: "jonas" });
    const conversations = await client.conversations.list({ contactId: items[0]?.id });

    expect(conversations.items).toHaveLength(1);
    expect(conversations.items[0]?.contact.name).toBe("Jonas Berg");
  });
});

describe("conversations.search", () => {
  it("finds conversations by what was said, and by who they are with", async () => {
    const client = await signedInAgent();

    const byMessage = await client.conversations.search("billing address");
    expect(byMessage.map((item) => item.contact.name)).toEqual(["Jonas Berg"]);

    const byContact = await client.conversations.search("priya");
    expect(byContact.map((item) => item.contact.name)).toEqual(["Priya Nair"]);

    await expect(client.conversations.search("no such words")).resolves.toEqual([]);
  });
});

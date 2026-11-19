import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient, type Database } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// Browsers are written by the app's server, so these put them in with the secret key and read
// them as a team member, against the local database and its demo data.
const PRIYA = "c0000000-0000-4000-8000-000000000002";
const browsing = `core-test-${crypto.randomUUID()}`;
const idle = `core-test-${crypto.randomUUID()}`;
const arriving = `core-test-${crypto.randomUUID()}`;
const priyas = `core-test-${crypto.randomUUID()}`;

async function signedInAgent() {
  const client = createHelpwrenClient({ supabase: browserClient() });
  const result = await client.auth.verifyLoginCode(
    "sam@example.com",
    await issueLoginCode("sam@example.com"),
  );
  if (!result.ok) throw new Error("Could not sign in.");
  return client;
}

beforeAll(async () => {
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  // One at a time: in a batch, a column one row leaves out would be null for it, not its default.
  const rows: Database["public"]["Tables"]["visitors"]["Insert"][] = [
    {
      id: browsing,
      page_url: "https://shop.example.com/pricing",
      page_title: "Pricing",
      country: "GB",
      city: "London",
      recent_pages: [
        { url: "https://shop.example.com/pricing", title: "Pricing", at: minutesAgo(0) },
        { url: "https://shop.example.com/", title: "Home", at: minutesAgo(1) },
        "not a page",
      ],
      pending_message: "Can I help?",
      pending_agent_id: "a0000000-0000-4000-8000-000000000002",
      pending_at: minutesAgo(0),
    },
    { id: idle, page_url: "https://shop.example.com/", last_seen_at: minutesAgo(10) },
    { id: arriving, page_url: "https://shop.example.com/", session_started_at: minutesAgo(0) },
    {
      id: priyas,
      contact_id: PRIYA,
      page_url: "https://shop.example.com/account",
      last_seen_at: minutesAgo(30),
    },
  ];
  for (const row of rows) {
    const { error } = await serverClient().from("visitors").insert(row);
    if (error) throw error;
  }
});

afterAll(async () => {
  await serverClient().from("visitors").delete().in("id", [browsing, idle, arriving, priyas]);
});

describe("visitors", () => {
  it("lists who checked in lately, with their page, place and waiting message", async () => {
    const client = await signedInAgent();
    const { items: visitors, total } = await client.visitors.list({ activeWithinSeconds: 120 });
    const ids = visitors.map((visitor) => visitor.id);
    expect(total).toBe(visitors.length);

    expect(ids).toContain(browsing);
    expect(ids).not.toContain(idle);
    expect(visitors.find((visitor) => visitor.id === browsing)).toMatchObject({
      contact: null,
      page: { url: "https://shop.example.com/pricing", title: "Pricing" },
      location: { country: "GB", region: null, city: "London" },
      recentPages: [{ title: "Pricing" }, { title: "Home" }],
      outreach: { status: "waiting", message: "Can I help?", from: "Sam Rivera" },
    });
  });

  it("pages through who is on the site, counting them all", async () => {
    const client = await signedInAgent();
    const all = await client.visitors.list();
    expect(all.total).toBeGreaterThanOrEqual(2);

    const first = await client.visitors.list({ page: 1, limit: 1 });
    const second = await client.visitors.list({ page: 2, limit: 1 });
    expect(first.total).toBe(all.total);
    expect(first.items.map((visitor) => visitor.id)).toEqual([all.items[0]?.id]);
    expect(second.items.map((visitor) => visitor.id)).toEqual([all.items[1]?.id]);

    const past = await client.visitors.list({ page: all.total + 1, limit: 1 });
    expect(past).toEqual({ items: [], total: all.total });
  });

  it("finds a contact's browser, with who they are", async () => {
    const client = await signedInAgent();
    await expect(client.visitors.latestForContact(PRIYA)).resolves.toMatchObject({
      id: priyas,
      contact: { id: PRIYA, name: "Priya Nair" },
    });
    await expect(client.visitors.get(idle)).resolves.toMatchObject({ id: idle, contact: null });
  });

  it("shows nobody to someone who is not on the team", async () => {
    const client = createHelpwrenClient({ supabase: browserClient() });
    const guest = await client.sessions.startGuest();
    try {
      await expect(client.visitors.list()).resolves.toEqual({ items: [], total: 0 });
      await expect(client.visitors.get(browsing)).resolves.toBeNull();
    } finally {
      await serverClient().auth.admin.deleteUser(guest.id);
    }
  });
});

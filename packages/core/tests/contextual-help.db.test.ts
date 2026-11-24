import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, serverClient } from "./support/local-supabase";
import { runMarker, signIn } from "./support/test-data";

// Against the shared local database: only the collection, articles and rules made here, which
// carry this run's marker, are looked for.
const run = runMarker();
const TAG = `glossary-${run}`;
let collectionId = "";
const ruleIds: string[] = [];

beforeAll(async () => {
  const { data, error } = await serverClient()
    .from("collections")
    .insert({ name: `Contextual ${run}`, slug: `contextual-${run}` })
    .select("id")
    .single();
  if (error) throw error;
  collectionId = data.id;
  const inserted = await serverClient()
    .from("articles")
    .insert([
      {
        collection_id: collectionId,
        title: `For business ${run}`,
        slug: `for-business-${run}`,
        status: "published",
        tags: [TAG],
        audiences: ["business"],
        locale: "en",
        fields: { plan: "pro" },
      },
      {
        collection_id: collectionId,
        title: `For everyone ${run}`,
        slug: `for-everyone-${run}`,
        status: "published",
        tags: [TAG],
        audiences: [],
        locale: null,
        fields: {},
      },
      {
        collection_id: collectionId,
        title: `Still a draft ${run}`,
        slug: `still-a-draft-${run}`,
        status: "draft",
        tags: [TAG],
        audiences: [],
        locale: null,
        fields: {},
      },
    ]);
  if (inserted.error) throw inserted.error;
});

afterAll(async () => {
  await serverClient().from("help_rules").delete().in("id", ruleIds);
  await serverClient().from("articles").delete().eq("collection_id", collectionId);
  await serverClient().from("collections").delete().eq("id", collectionId);
});

describe("articles.find", () => {
  // A visitor with no session at all, as a host page's own code is.
  const visitor = createHelpwrenClient({ supabase: browserClient() });

  it("evaluates the filter in the database, over published articles only", async () => {
    const found = await visitor.articles.find({ tags: { any: [TAG] }, limit: 10 });
    expect(found.map((article) => article.slug)).toEqual([
      `for-business-${run}`,
      `for-everyone-${run}`,
    ]);
    expect(found[0]).toMatchObject({
      audiences: ["business"],
      locale: "en",
      fields: { plan: "pro" },
    });
  });

  it("combines every part with AND", async () => {
    const audience = await visitor.articles.find({ tags: { any: [TAG] }, audience: "customer" });
    expect(audience.map((article) => article.slug)).toEqual([`for-everyone-${run}`]);
    const fields = await visitor.articles.find({ tags: { any: [TAG] }, fields: { plan: "pro" } });
    expect(fields.map((article) => article.slug)).toEqual([`for-business-${run}`]);
  });

  it("checks the filter before asking", async () => {
    await expect(visitor.articles.find({ limit: 0 })).rejects.toThrow();
  });
});

describe("one audience", () => {
  const visitor = createHelpwrenClient({ supabase: browserClient() });
  const slugs = (items: { slug: string }[]) => items.map((item) => item.slug).sort();
  const business = `for-business-${run}`;
  const everyone = `for-everyone-${run}`;

  it("lists and searches its articles and the ones for everyone", async () => {
    const list = async (audience?: string) =>
      slugs((await visitor.articles.list({ collectionId, audience })).items);
    expect(await list()).toEqual([business, everyone]);
    expect(await list("Business")).toEqual([business, everyone]);
    expect(await list("customer")).toEqual([everyone]);
    // A name with everything the query language reads as its own finds nothing more.
    expect(await list('a"b\\c,{d}),status.eq.draft')).toEqual([everyone]);

    const found = (audience: string) => visitor.articles.search(`For ${run}`, { audience });
    expect(slugs(await found("business"))).toEqual([business, everyone]);
    expect(slugs(await found("customer"))).toEqual([everyone]);
  });

  it("counts only those in a collection, and leaves out one with none", async () => {
    const count = async (audience?: string) =>
      (await visitor.collections.list({ audience })).find((item) => item.id === collectionId)
        ?.articleCount;
    expect(await count()).toBe(2);
    expect(await count("business")).toBe(2);
    expect(await count("customer")).toBe(1);

    const other = await serverClient()
      .from("collections")
      .insert({ name: `Business ${run}`, slug: `business-only-${run}` })
      .select("id")
      .single();
    if (other.error) throw other.error;
    const { error } = await serverClient()
      .from("articles")
      .insert({
        collection_id: other.data.id,
        title: `Only business ${run}`,
        slug: `only-business-${run}`,
        status: "published",
        audiences: ["business"],
      });
    if (error) throw error;
    try {
      const listed = async (audience: string) =>
        (await visitor.collections.list({ audience })).some((item) => item.id === other.data.id);
      expect(await listed("business")).toBe(true);
      expect(await listed("customer")).toBe(false);
    } finally {
      await serverClient().from("articles").delete().eq("collection_id", other.data.id);
      await serverClient().from("collections").delete().eq("id", other.data.id);
    }
  });
});

describe("helpRules", () => {
  it("lets an admin add, change, reorder and remove rules", async () => {
    const { client } = await signIn("ada@example.com");
    const first = await client.helpRules.create({
      name: `First ${run}`,
      urlMatch: "matches",
      urlValue: "/bookings/*",
      filter: { tags: { any: [TAG] } },
    });
    const second = await client.helpRules.create({
      name: `Second ${run}`,
      urlMatch: "contains",
      urlValue: "checkout",
      audience: "Business",
      filter: { q: "payment failed", limit: 3 },
    });
    if (!first.ok || !second.ok) throw new Error("The rules were not saved.");
    ruleIds.push(first.rule.id, second.rule.id);
    expect(second.rule).toMatchObject({ audience: "business", enabled: true });

    const off = await client.helpRules.setEnabled(first.rule.id, false);
    expect(off.ok && off.rule.enabled).toBe(false);

    await client.helpRules.reorder([second.rule.id, first.rule.id]);
    const mine = (await client.helpRules.list()).filter((rule) => rule.name.endsWith(run));
    expect(mine.map((rule) => rule.name)).toEqual([`Second ${run}`, `First ${run}`]);

    await expect(client.helpRules.remove(second.rule.id)).resolves.toEqual({ ok: true });
  });

  it("lets an agent read the rules and change none", async () => {
    const { client } = await signIn("sam@example.com");
    const attempt = await client.helpRules.create({
      name: `Agent ${run}`,
      urlMatch: "is",
      urlValue: "/x",
      filter: {},
    });
    expect(attempt).toEqual({ ok: false, reason: "forbidden" });
    const rules = await client.helpRules.list();
    expect(rules.some((rule) => rule.name === `First ${run}`)).toBe(true);
    const id = ruleIds[0] ?? "";
    await expect(client.helpRules.setEnabled(id, true)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

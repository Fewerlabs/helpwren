import { afterAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local database and its demo data: three collections holding six
// published articles and one draft. Everything made here is named "(test)" and removed after.
const GETTING_STARTED = "f0000000-0000-4000-8000-000000000001";
const PUBLISHED = "f1000000-0000-4000-8000-000000000001";
const DRAFT = "f1000000-0000-4000-8000-000000000007";
const startedAt = new Date().toISOString();
const uploaded: string[] = [];

async function signedIn(email: string) {
  const client = createHelpwrenClient({ supabase: browserClient() });
  const result = await client.auth.verifyLoginCode(email, await issueLoginCode(email));
  if (!result.ok) throw new Error(`Could not sign in as ${email}.`);
  return client;
}

/** Someone with no session at all, as on the public help center. */
const visitor = () => createHelpwrenClient({ supabase: browserClient() });

afterAll(async () => {
  const server = serverClient();
  await server.from("article_feedback").delete().gte("created_at", startedAt);
  await server.from("articles").delete().like("title", "%(test)%");
  await server.from("collections").delete().like("name", "%(test)%");
  if (uploaded.length > 0) await server.storage.from("articles").remove(uploaded);
});

describe("the help center, for a visitor", () => {
  it("lists the collections in order, counting published articles only", async () => {
    const collections = await visitor().collections.list();
    expect(collections.map((collection) => [collection.slug, collection.articleCount])).toEqual([
      ["getting-started", 4],
      ["account-and-billing", 2],
      ["troubleshooting", 1],
    ]);
    await expect(visitor().collections.getBySlug("getting-started")).resolves.toMatchObject({
      name: "Getting started",
      icon: "rocket-launch",
    });
    await expect(visitor().collections.getBySlug("no-such-collection")).resolves.toBeNull();
  });

  it("lists a collection's articles in their order, without drafts", async () => {
    const page = await visitor().articles.list({ collectionId: GETTING_STARTED });
    expect(page.total).toBe(4);
    expect(page.items.map((article) => article.slug)).toEqual([
      "add-the-chat-to-your-website",
      "invite-your-team",
      "make-the-chat-match-your-brand",
      "take-a-tour-of-the-inbox",
    ]);
    expect(page.items[0]?.collection).toMatchObject({ slug: "getting-started" });

    const everything = await visitor().articles.list();
    expect(everything.total).toBe(7);
  });

  it("reads a published article by its slug, and no draft", async () => {
    const article = await visitor().articles.getBySlug("add-the-chat-to-your-website");
    expect(article).toMatchObject({ id: PUBLISHED, status: "published" });
    expect(article?.body.type).toBe("doc");
    expect(article?.publishedAt).not.toBeNull();

    await expect(visitor().articles.getBySlug("messages-arrive-late")).resolves.toBeNull();
    await expect(visitor().articles.get(DRAFT)).resolves.toBeNull();
    await expect(visitor().articles.getBySlug("Not A Slug")).resolves.toBeNull();
  });

  it("searches titles, summaries and bodies as the words are typed", async () => {
    const byBody = await visitor().articles.search("tag manag");
    expect(byBody.map((article) => article.slug)).toEqual(["add-the-chat-to-your-website"]);

    const byTitle = await visitor().articles.search("invoice");
    expect(byTitle[0]?.slug).toBe("read-your-invoice");

    await expect(visitor().articles.search("late")).resolves.toEqual([]);
    await expect(visitor().articles.search("   ")).resolves.toEqual([]);

    const listed = await visitor().articles.list({ search: "chat", pageSize: 2 });
    expect(listed.items).toHaveLength(2);
    expect(listed.total).toBeGreaterThan(2);
  });

  it("records whether an article helped, for published articles only", async () => {
    await expect(visitor().articles.sendFeedback(PUBLISHED, true)).resolves.toEqual({ ok: true });
    await expect(visitor().articles.sendFeedback(DRAFT, true)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    await expect(visitor().articles.feedbackTotals()).rejects.toThrow();
  });

  it("is refused anything that writes", async () => {
    await expect(visitor().articles.create({ title: "Spam (test)" })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    await expect(visitor().collections.create({ name: "Spam (test)" })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    await expect(visitor().articles.remove(PUBLISHED)).rejects.toThrow();
    const picture = new Blob([new Uint8Array(8)], { type: "image/png" });
    await expect(visitor().articles.uploadImage(picture)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });
});

describe("the help center, for the team", () => {
  it("takes an article from a draft to published and back", async () => {
    const agent = await signedIn("sam@example.com");

    const made = await agent.articles.create({ title: "  Export your data (test) " });
    if (!made.ok) throw new Error(`The article was refused: ${made.reason}`);
    expect(made.article).toMatchObject({
      title: "Export your data (test)",
      slug: "export-your-data-test",
      status: "draft",
      collectionId: null,
      authorId: "a0000000-0000-4000-8000-000000000002",
      publishedAt: null,
    });
    const { id } = made.article;

    // The same title again finds the next free slug.
    const twin = await agent.articles.create({ title: "Export your data (test)" });
    expect(twin).toMatchObject({ ok: true, article: { slug: "export-your-data-test-2" } });
    await expect(
      agent.articles.create({ title: "Other (test)", slug: "export-your-data-test" }),
    ).resolves.toEqual({ ok: false, reason: "slug_taken" });

    // Changing the title leaves the address alone.
    const body = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [{ type: "text" as const, text: "Zebra crossing" }],
        },
      ],
    };
    const renamed = await agent.articles.update(id, {
      title: "Download your data (test)",
      summary: "Everything you have stored, as a file.",
      body,
    });
    expect(renamed).toMatchObject({
      ok: true,
      article: {
        slug: "export-your-data-test",
        summary: "Everything you have stored, as a file.",
        body,
      },
    });

    // A draft is found by the team's search and by nobody else's.
    const found = await agent.articles.search("zebra", { includeDrafts: true });
    expect(found.map((article) => article.id)).toEqual([id]);
    await expect(agent.articles.search("zebra")).resolves.toEqual([]);
    await expect(visitor().articles.search("zebra")).resolves.toEqual([]);

    await expect(agent.articles.publish(id)).resolves.toEqual({
      ok: false,
      reason: "needs_collection",
    });
    await agent.articles.update(id, { collectionId: GETTING_STARTED });
    const published = await agent.articles.publish(id);
    expect(published).toMatchObject({ ok: true, article: { status: "published", position: 5 } });
    await expect(visitor().articles.getBySlug("export-your-data-test")).resolves.toMatchObject({
      id,
    });

    await expect(agent.articles.update(id, { slug: "moved-test" })).resolves.toEqual({
      ok: false,
      reason: "slug_locked",
    });
    await expect(agent.articles.update(id, { collectionId: null })).resolves.toEqual({
      ok: false,
      reason: "needs_collection",
    });

    await expect(agent.articles.unpublish(id)).resolves.toMatchObject({
      ok: true,
      article: { status: "draft" },
    });
    await expect(visitor().articles.getBySlug("export-your-data-test")).resolves.toBeNull();
    await expect(agent.articles.getBySlug("export-your-data-test")).resolves.toMatchObject({ id });
    await expect(
      agent.articles.getBySlug("export-your-data-test", { publishedOnly: true }),
    ).resolves.toBeNull();
    await expect(agent.articles.update(id, { slug: "moved-test" })).resolves.toMatchObject({
      ok: true,
      article: { slug: "moved-test" },
    });

    const drafts = await agent.articles.list({ status: "draft", collectionId: GETTING_STARTED });
    expect(drafts.items.map((article) => article.id)).toEqual([id]);
    const counts = await agent.articles.counts();
    expect(counts.uncategorised).toBe(1);
    expect(counts.total).toBe(10);

    await expect(agent.articles.remove(id)).resolves.toEqual({ ok: true });
    await expect(agent.articles.remove(id)).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(agent.articles.update(id, { title: "Gone (test)" })).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("makes, changes, reorders and removes collections", async () => {
    const agent = await signedIn("sam@example.com");

    const made = await agent.collections.create({
      name: "Shipping (test)",
      description: "Where your order is.",
      icon: "package",
    });
    if (!made.ok) throw new Error(`The collection was refused: ${made.reason}`);
    expect(made.collection).toMatchObject({
      slug: "shipping-test",
      description: "Where your order is.",
      icon: "package",
      articleCount: 0,
      position: 4,
    });
    const second = await agent.collections.create({ name: "Returns (test)" });
    if (!second.ok) throw new Error(`The collection was refused: ${second.reason}`);
    expect(second.collection).toMatchObject({ icon: "book-open", description: null });

    await expect(
      agent.collections.update(second.collection.id, { slug: "shipping-test" }),
    ).resolves.toEqual({ ok: false, reason: "slug_taken" });
    await expect(
      agent.collections.update(made.collection.id, { name: "Delivery (test)", description: "" }),
    ).resolves.toMatchObject({
      ok: true,
      collection: { name: "Delivery (test)", slug: "shipping-test", description: null },
    });
    await expect(
      agent.collections.update(GETTING_STARTED, { slug: "start-here" }),
    ).resolves.toEqual({ ok: false, reason: "slug_locked" });

    // Two articles, to put in a new order.
    const first = await agent.articles.create({
      title: "Track a parcel (test)",
      collectionId: made.collection.id,
    });
    const last = await agent.articles.create({
      title: "Change the address (test)",
      collectionId: made.collection.id,
    });
    if (!first.ok || !last.ok) throw new Error("The articles were refused.");
    await agent.articles.reorder([last.article.id, first.article.id]);
    const inOrder = await agent.articles.list({ collectionId: made.collection.id });
    expect(inOrder.items.map((article) => article.id)).toEqual([last.article.id, first.article.id]);

    await expect(agent.collections.remove(made.collection.id)).resolves.toEqual({
      ok: false,
      reason: "not_empty",
    });
    await agent.articles.remove(first.article.id);
    await agent.articles.remove(last.article.id);
    await expect(agent.collections.remove(made.collection.id)).resolves.toEqual({ ok: true });
    await expect(agent.collections.remove(made.collection.id)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });

    const all = await agent.collections.list();
    expect(all.find((collection) => collection.slug === "troubleshooting")?.articleCount).toBe(2);
  });

  it("keeps an article's tags, where it shows, and what search engines are told", async () => {
    const agent = await signedIn("sam@example.com");
    const made = await agent.articles.create({
      title: "Refund a booking (test)",
      collectionId: GETTING_STARTED,
      tags: ["Refunds", " ios ", "refunds"],
    });
    if (!made.ok) throw new Error(`The article was refused: ${made.reason}`);
    // Lower case, trimmed, and each once.
    expect(made.article).toMatchObject({
      tags: ["refunds", "ios"],
      visibility: "public",
      featured: false,
      metaTitle: null,
    });

    const changed = await agent.articles.update(made.article.id, {
      visibility: "in_app",
      featured: true,
      metaTitle: "Refunds explained",
      metaDescription: "How and when a booking is refunded.",
      authorId: "a0000000-0000-4000-8000-000000000001",
    });
    expect(changed).toMatchObject({
      ok: true,
      article: {
        visibility: "in_app",
        featured: true,
        metaTitle: "Refunds explained",
        metaDescription: "How and when a booking is refunded.",
        authorId: "a0000000-0000-4000-8000-000000000001",
        tags: ["refunds", "ios"],
      },
    });
    await expect(agent.articles.update(made.article.id, { metaTitle: "" })).resolves.toMatchObject({
      ok: true,
      article: { metaTitle: null },
    });
    await agent.articles.publish(made.article.id);

    const tagged = await agent.articles.list({ tags: ["refunds", "no-such-tag"] });
    expect(tagged.items.map((article) => article.id)).toEqual([made.article.id]);
    const byAda = await agent.articles.list({
      authorIds: ["a0000000-0000-4000-8000-000000000001"],
      tags: ["ios"],
    });
    expect(byAda.items.map((article) => article.id)).toEqual([made.article.id]);
    expect(await agent.articles.tags()).toEqual(
      expect.arrayContaining(["ios", "refunds", "widget"]),
    );
    const featured = await visitor().articles.list({ featured: true, visibility: "public" });
    expect(featured.items.map((article) => article.slug).sort()).toEqual([
      "add-the-chat-to-your-website",
      "the-chat-does-not-appear",
    ]);

    // Found by its tag. On the help center's own search it is left out, in the chat it is not.
    const inChat = await visitor().articles.search("refunds");
    expect(inChat.map((article) => article.id)).toEqual([made.article.id]);
    await expect(visitor().articles.search("refunds", { visibility: "public" })).resolves.toEqual(
      [],
    );
  });

  it("reads what readers answered", async () => {
    const agent = await signedIn("sam@example.com");
    const totals = await agent.articles.feedbackTotals();
    expect(totals[PUBLISHED]?.helpful).toBeGreaterThanOrEqual(2);
    expect(totals[PUBLISHED]?.unhelpful).toBeGreaterThanOrEqual(1);
    expect(totals[DRAFT]).toBeUndefined();
  });

  it("stores a picture for an article at a public address", async () => {
    const agent = await signedIn("sam@example.com");
    const picture = new Blob([new Uint8Array(8)], { type: "image/png" });
    const result = await agent.articles.uploadImage(picture);
    if (!result.ok) throw new Error(`The picture was refused: ${result.reason}`);
    uploaded.push(result.url.slice(result.url.lastIndexOf("/") + 1));
    expect(result.url).toMatch(/\/storage\/v1\/object\/public\/articles\/[0-9a-f-]+\.png$/);

    await expect(
      agent.articles.uploadImage(new Blob(["<svg/>"], { type: "image/svg+xml" })),
    ).resolves.toEqual({ ok: false, reason: "unsupported" });
  });
});

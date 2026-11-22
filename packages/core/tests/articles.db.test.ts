import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, serverClient } from "./support/local-supabase";
import { runMarker, signIn } from "./support/test-data";

// These run against the shared local database, which may hold anyone's articles. The tests read
// only the collections and articles made here, whose titles and slugs carry this run's marker.
const run = runMarker();
const ADA = "a0000000-0000-4000-8000-000000000001";
const SAM = "a0000000-0000-4000-8000-000000000002";
const uploaded: string[] = [];

const made = { guides: "", billing: "", tour: "", addChat: "", late: "", invoice: "" };

const doc = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }],
});

async function insertCollection(name: string, slug: string) {
  const { data, error } = await serverClient()
    .from("collections")
    .insert({ name, slug, icon: "rocket-launch" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function insertArticle(values: {
  collectionId: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  body?: string;
  featured?: boolean;
}) {
  const { data, error } = await serverClient()
    .from("articles")
    .insert({
      collection_id: values.collectionId,
      title: values.title,
      slug: values.slug,
      status: values.status,
      author_id: ADA,
      featured: values.featured ?? false,
      body: doc(values.body ?? values.title),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Two collections, shaped like the demo's: one with two published articles and a draft, kept
// in an order that is not alphabetical, and one with a single article.
beforeAll(async () => {
  made.guides = await insertCollection(`Guides ${run}`, `guides-${run}`);
  made.billing = await insertCollection(`Billing ${run}`, `billing-${run}`);
  made.tour = await insertArticle({
    collectionId: made.guides,
    title: `Take a tour ${run}`,
    slug: `take-a-tour-${run}`,
    status: "published",
  });
  made.addChat = await insertArticle({
    collectionId: made.guides,
    title: `Add the chat ${run}`,
    slug: `add-the-chat-${run}`,
    status: "published",
    body: `Paste the snippet into your ${run} tag manager.`,
    featured: true,
  });
  made.late = await insertArticle({
    collectionId: made.guides,
    title: `Messages arrive late ${run}`,
    slug: `messages-arrive-late-${run}`,
    status: "draft",
  });
  made.invoice = await insertArticle({
    collectionId: made.billing,
    title: `Read your invoice ${run}`,
    slug: `read-your-invoice-${run}`,
    status: "published",
  });
  const { error } = await serverClient()
    .from("article_feedback")
    .insert([
      { article_id: made.tour, helpful: true },
      { article_id: made.tour, helpful: true },
      { article_id: made.tour, helpful: false },
    ]);
  if (error) throw error;
});

afterAll(async () => {
  const server = serverClient();
  await server.from("articles").delete().like("slug", `%${run}%`);
  await server.from("collections").delete().like("slug", `%${run}%`);
  if (uploaded.length > 0) await server.storage.from("articles").remove(uploaded);
});

async function signedIn(email: string) {
  return (await signIn(email)).client;
}

/** Someone with no session at all, as on the public help center. */
const visitor = () => createHelpwrenClient({ supabase: browserClient() });

const mine = <T extends { slug: string }>(items: T[]) =>
  items.filter((item) => item.slug.endsWith(run));

describe("the help center, for a visitor", () => {
  it("lists the collections in order, counting published articles only", async () => {
    const collections = await visitor().collections.list();
    expect(
      mine(collections).map((collection) => [collection.slug, collection.articleCount]),
    ).toEqual([
      [`guides-${run}`, 2],
      [`billing-${run}`, 1],
    ]);
    const positions = collections.map((collection) => collection.position);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));

    await expect(visitor().collections.getBySlug(`guides-${run}`)).resolves.toMatchObject({
      name: `Guides ${run}`,
      icon: "rocket-launch",
    });
    await expect(visitor().collections.getBySlug(`no-such-collection-${run}`)).resolves.toBeNull();
  });

  it("lists a collection's articles in their order, without drafts", async () => {
    const page = await visitor().articles.list({ collectionId: made.guides });
    expect(page.total).toBe(2);
    expect(page.items.map((article) => article.slug)).toEqual([
      `take-a-tour-${run}`,
      `add-the-chat-${run}`,
    ]);
    expect(page.items[0]?.collection).toMatchObject({ slug: `guides-${run}` });

    const everything = await visitor().articles.list({ search: run, pageSize: 100 });
    expect(everything.items.map((article) => article.id).sort()).toEqual(
      [made.tour, made.addChat, made.invoice].sort(),
    );
    expect(everything.total).toBe(3);
  });

  it("reads a published article by its slug, and no draft", async () => {
    const article = await visitor().articles.getBySlug(`add-the-chat-${run}`);
    expect(article).toMatchObject({ id: made.addChat, status: "published" });
    expect(article?.body.type).toBe("doc");
    expect(article?.publishedAt).not.toBeNull();

    await expect(visitor().articles.getBySlug(`messages-arrive-late-${run}`)).resolves.toBeNull();
    await expect(visitor().articles.get(made.late)).resolves.toBeNull();
    await expect(visitor().articles.getBySlug("Not A Slug")).resolves.toBeNull();
  });

  it("searches titles, summaries and bodies as the words are typed", async () => {
    const byBody = await visitor().articles.search(`${run} tag manag`);
    expect(byBody.map((article) => article.slug)).toEqual([`add-the-chat-${run}`]);

    const byTitle = await visitor().articles.search(`${run} invoice`);
    expect(byTitle[0]?.slug).toBe(`read-your-invoice-${run}`);

    // The only article with this word is a draft.
    await expect(visitor().articles.search(`${run} late`)).resolves.toEqual([]);
    await expect(visitor().articles.search("   ")).resolves.toEqual([]);

    const listed = await visitor().articles.list({ search: run, pageSize: 2 });
    expect(listed.items).toHaveLength(2);
    expect(listed.total).toBe(3);
  });

  it("sends whether an article helped through the API, which keeps the count", async () => {
    const calls: string[] = [];
    const reader = createHelpwrenClient({
      supabase: browserClient(),
      apiUrl: "https://help.example.com",
      fetch: (input) => {
        const url = input instanceof Request ? input.url : input.toString();
        calls.push(url);
        return Promise.resolve(
          url.includes(made.late)
            ? Response.json(
                { error: { code: "not_found", message: "No such article." } },
                { status: 404 },
              )
            : new Response(null, { status: 204 }),
        );
      },
    });
    await expect(reader.articles.sendFeedback(made.addChat, true)).resolves.toEqual({ ok: true });
    await expect(reader.articles.sendFeedback(made.late, true)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(calls[0]).toBe(`https://help.example.com/api/articles/${made.addChat}/feedback`);
    await expect(visitor().articles.feedbackTotals()).rejects.toThrow();
  });

  it("lets no reader answer straight into the database, where nothing could limit it", async () => {
    const { error } = await browserClient()
      .from("article_feedback")
      .insert({ article_id: made.addChat, helpful: true });
    expect(error).not.toBeNull();
  });

  it("is refused anything that writes", async () => {
    await expect(visitor().articles.create({ title: `Spam ${run}` })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    await expect(visitor().collections.create({ name: `Spam ${run}` })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    await expect(visitor().articles.remove(made.addChat)).rejects.toThrow();
    await expect(visitor().articles.getBySlug(`add-the-chat-${run}`)).resolves.not.toBeNull();
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

    const created = await agent.articles.create({ title: `  Export your data ${run} ` });
    if (!created.ok) throw new Error(`The article was refused: ${created.reason}`);
    expect(created.article).toMatchObject({
      title: `Export your data ${run}`,
      slug: `export-your-data-${run}`,
      status: "draft",
      collectionId: null,
      authorId: SAM,
      publishedAt: null,
    });
    const { id } = created.article;

    // The same title again finds the next free slug.
    const twin = await agent.articles.create({ title: `Export your data ${run}` });
    expect(twin).toMatchObject({ ok: true, article: { slug: `export-your-data-${run}-2` } });
    await expect(
      agent.articles.create({ title: `Other ${run}`, slug: `export-your-data-${run}` }),
    ).resolves.toEqual({ ok: false, reason: "slug_taken" });

    // A draft in no collection is counted for the team, and never for a visitor.
    const counts = await agent.articles.counts();
    const visitorCounts = await visitor().articles.counts();
    expect(counts.uncategorised).toBeGreaterThanOrEqual(2);
    expect(counts.total).toBeGreaterThan(visitorCounts.total);
    expect(visitorCounts.uncategorised).toBe(0);

    // Changing the title leaves the address alone.
    const body = doc(`Zebra crossing ${run}`);
    const renamed = await agent.articles.update(id, {
      title: `Download your data ${run}`,
      summary: "Everything you have stored, as a file.",
      body,
    });
    expect(renamed).toMatchObject({
      ok: true,
      article: {
        slug: `export-your-data-${run}`,
        summary: "Everything you have stored, as a file.",
        body,
      },
    });

    // A draft is found by the team's search and by nobody else's.
    const found = await agent.articles.search(`zebra ${run}`, { includeDrafts: true });
    expect(found.map((article) => article.id)).toEqual([id]);
    await expect(agent.articles.search(`zebra ${run}`)).resolves.toEqual([]);
    await expect(visitor().articles.search(`zebra ${run}`)).resolves.toEqual([]);

    await expect(agent.articles.publish(id)).resolves.toEqual({
      ok: false,
      reason: "needs_collection",
    });
    await agent.articles.update(id, { collectionId: made.guides });
    // It goes to the end of the collection, after the three already there.
    const published = await agent.articles.publish(id);
    expect(published).toMatchObject({ ok: true, article: { status: "published", position: 4 } });
    await expect(visitor().articles.getBySlug(`export-your-data-${run}`)).resolves.toMatchObject({
      id,
    });

    await expect(agent.articles.update(id, { slug: `moved-${run}` })).resolves.toEqual({
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
    await expect(visitor().articles.getBySlug(`export-your-data-${run}`)).resolves.toBeNull();
    await expect(agent.articles.getBySlug(`export-your-data-${run}`)).resolves.toMatchObject({
      id,
    });
    await expect(
      agent.articles.getBySlug(`export-your-data-${run}`, { publishedOnly: true }),
    ).resolves.toBeNull();
    await expect(agent.articles.update(id, { slug: `moved-${run}` })).resolves.toMatchObject({
      ok: true,
      article: { slug: `moved-${run}` },
    });

    const drafts = await agent.articles.list({ status: "draft", collectionId: made.guides });
    expect(drafts.items.map((article) => article.id)).toEqual([made.late, id]);

    await expect(agent.articles.remove(id)).resolves.toEqual({ ok: true });
    await expect(agent.articles.remove(id)).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(agent.articles.update(id, { title: `Gone ${run}` })).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    if (twin.ok) await agent.articles.remove(twin.article.id);
  });

  it("publishes, moves, unpublishes and removes many articles at once", async () => {
    const agent = await signedIn("sam@example.com");
    const make = async (title: string) => {
      const created = await agent.articles.create({ title: `${title} ${run}` });
      if (!created.ok) throw new Error(`The article was refused: ${created.reason}`);
      return created.article.id;
    };
    const one = await make("Bulk one");
    const two = await make("Bulk two");
    const loose = await make("Bulk loose");

    // None is in a collection yet, so none can be published.
    await expect(agent.articles.publishMany([one, two, loose])).resolves.toEqual({ changed: 0 });

    await expect(agent.articles.moveMany([one, two], made.guides)).resolves.toEqual({
      changed: 2,
    });
    // Each takes its own place at the end of the collection.
    const moved = await Promise.all([agent.articles.get(one), agent.articles.get(two)]);
    expect(moved.map((article) => article?.collectionId)).toEqual([made.guides, made.guides]);
    expect(moved[0]?.position).not.toBe(moved[1]?.position);

    // The one in no collection is left a draft, and the others still go out.
    await expect(agent.articles.publishMany([one, two, loose])).resolves.toEqual({ changed: 2 });
    await expect(agent.articles.get(loose)).resolves.toMatchObject({ status: "draft" });
    await expect(agent.articles.get(one)).resolves.toMatchObject({ status: "published" });

    await expect(agent.articles.unpublishMany([one, two])).resolves.toEqual({ changed: 2 });
    await expect(agent.articles.get(two)).resolves.toMatchObject({ status: "draft" });

    await expect(agent.articles.removeMany([one, two, loose])).resolves.toEqual({ changed: 3 });
    await expect(agent.articles.removeMany([one, two, loose])).resolves.toEqual({ changed: 0 });
    await expect(agent.articles.removeMany([])).resolves.toEqual({ changed: 0 });
  });

  it("makes, changes, reorders and removes collections", async () => {
    const agent = await signedIn("sam@example.com");
    const before = await agent.collections.list();

    const created = await agent.collections.create({
      name: `Shipping ${run}`,
      description: "Where your order is.",
      icon: "package",
    });
    if (!created.ok) throw new Error(`The collection was refused: ${created.reason}`);
    expect(created.collection).toMatchObject({
      slug: `shipping-${run}`,
      description: "Where your order is.",
      icon: "package",
      articleCount: 0,
    });
    // A new collection goes after every one already there.
    for (const collection of before) {
      expect(created.collection.position).toBeGreaterThan(collection.position);
    }
    const second = await agent.collections.create({ name: `Returns ${run}` });
    if (!second.ok) throw new Error(`The collection was refused: ${second.reason}`);
    expect(second.collection).toMatchObject({ icon: "book-open", description: null });
    expect(second.collection.position).toBeGreaterThan(created.collection.position);

    await expect(
      agent.collections.update(second.collection.id, { slug: `shipping-${run}` }),
    ).resolves.toEqual({ ok: false, reason: "slug_taken" });
    await expect(
      agent.collections.update(created.collection.id, {
        name: `Delivery ${run}`,
        description: "",
      }),
    ).resolves.toMatchObject({
      ok: true,
      collection: { name: `Delivery ${run}`, slug: `shipping-${run}`, description: null },
    });
    // This one has published articles, whose addresses hold its slug.
    await expect(
      agent.collections.update(made.guides, { slug: `start-here-${run}` }),
    ).resolves.toEqual({ ok: false, reason: "slug_locked" });

    // Two articles, to put in a new order.
    const first = await agent.articles.create({
      title: `Track a parcel ${run}`,
      collectionId: created.collection.id,
    });
    const last = await agent.articles.create({
      title: `Change the address ${run}`,
      collectionId: created.collection.id,
    });
    if (!first.ok || !last.ok) throw new Error("The articles were refused.");
    await agent.articles.reorder([last.article.id, first.article.id]);
    const inOrder = await agent.articles.list({ collectionId: created.collection.id });
    expect(inOrder.items.map((article) => article.id)).toEqual([last.article.id, first.article.id]);

    await expect(agent.collections.remove(created.collection.id)).resolves.toEqual({
      ok: false,
      reason: "not_empty",
    });
    // Asked to, it goes with articles in it, which are kept as drafts in no collection.
    await agent.articles.publish(first.article.id);
    await expect(
      agent.collections.remove(created.collection.id, { releaseArticles: true }),
    ).resolves.toEqual({ ok: true });
    await expect(agent.articles.get(first.article.id)).resolves.toMatchObject({
      status: "draft",
      collectionId: null,
    });
    await expect(agent.articles.get(last.article.id)).resolves.toMatchObject({
      status: "draft",
      collectionId: null,
    });
    await agent.articles.remove(first.article.id);
    await agent.articles.remove(last.article.id);
    await expect(agent.collections.remove(created.collection.id)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    await agent.collections.remove(second.collection.id);

    // The team's count takes in drafts: two published and one draft.
    const all = await agent.collections.list();
    expect(all.find((collection) => collection.id === made.guides)?.articleCount).toBe(3);
  });

  it("keeps an article's tags, where it shows, and what search engines are told", async () => {
    const agent = await signedIn("sam@example.com");
    const refunds = `refunds-${run}`;
    const ios = `ios-${run}`;
    const created = await agent.articles.create({
      title: `Refund a booking ${run}`,
      collectionId: made.guides,
      tags: [`Refunds-${run}`, ` ${ios} `, refunds],
    });
    if (!created.ok) throw new Error(`The article was refused: ${created.reason}`);
    // Lower case, trimmed, and each once.
    expect(created.article).toMatchObject({
      tags: [refunds, ios],
      visibility: "public",
      featured: false,
      metaTitle: null,
    });

    const changed = await agent.articles.update(created.article.id, {
      visibility: "in_app",
      featured: true,
      metaTitle: "Refunds explained",
      metaDescription: "How and when a booking is refunded.",
      authorId: ADA,
    });
    expect(changed).toMatchObject({
      ok: true,
      article: {
        visibility: "in_app",
        featured: true,
        metaTitle: "Refunds explained",
        metaDescription: "How and when a booking is refunded.",
        authorId: ADA,
        tags: [refunds, ios],
      },
    });
    await expect(
      agent.articles.update(created.article.id, { metaTitle: "" }),
    ).resolves.toMatchObject({
      ok: true,
      article: { metaTitle: null },
    });
    await agent.articles.publish(created.article.id);

    const tagged = await agent.articles.list({ tags: [refunds, `no-such-tag-${run}`] });
    expect(tagged.items.map((article) => article.id)).toEqual([created.article.id]);
    const byAda = await agent.articles.list({ authorIds: [ADA], tags: [ios] });
    expect(byAda.items.map((article) => article.id)).toEqual([created.article.id]);
    await expect(agent.articles.list({ authorIds: [SAM], tags: [ios] })).resolves.toMatchObject({
      total: 0,
    });
    expect(await agent.articles.tags()).toEqual(expect.arrayContaining([ios, refunds]));

    // The refund article is featured too, but only in the chat.
    const featured = await visitor().articles.list({
      featured: true,
      visibility: "public",
      search: run,
    });
    expect(featured.items.map((article) => article.slug)).toEqual([`add-the-chat-${run}`]);

    // Found by its tag. On the help center's own search it is left out, in the chat it is not.
    const inChat = await visitor().articles.search(`refunds ${run}`);
    expect(inChat.map((article) => article.id)).toEqual([created.article.id]);
    await expect(
      visitor().articles.search(`refunds ${run}`, { visibility: "public" }),
    ).resolves.toEqual([]);
  });

  it("reads what readers answered", async () => {
    const agent = await signedIn("sam@example.com");
    const totals = await agent.articles.feedbackTotals();
    expect(totals[made.tour]).toMatchObject({ helpful: 2, unhelpful: 1 });
    expect(totals[made.late]).toBeUndefined();
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

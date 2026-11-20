import { type Database } from "@helpwren/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as pageHelp } from "@/app/api/articles/contextual/route";
import { GET as listArticles, OPTIONS as preflight } from "@/app/api/articles/route";
import { POST as searchArticles } from "@/app/api/articles/search/route";
import { POST as startConversation } from "@/app/api/conversations/route";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, removePeople, type Person } from "./support/people";

// A request with no bearer token falls back to the session in its cookies. There is no request
// scope here, so the cookie store is an empty stand-in: these callers have no cookies.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));
// Nothing is kept between calls outside Next's own server, so the rules are read each time.
vi.mock("next/cache", () => ({ unstable_cache: <Fn>(read: Fn) => read }));

// Against the shared local database: the articles, collection and rules are made here, with
// this run's mark in their names, tags and slugs, and only those are looked for.
const RUN = crypto.randomUUID().slice(0, 8);
const TAG = `refunds-${RUN}`;
const made = { collection: "", rules: [] as string[] };
const people: Person[] = [];
let savedSettings: Pick<
  Database["public"]["Tables"]["settings"]["Row"],
  "key" | "value" | "is_public"
>[] = [];

beforeAll(async () => {
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("key, value, is_public")
    .in("key", ["allowed_domains", "contextual_help"]);
  savedSettings = settings ?? [];
  await supabaseAdmin.from("settings").upsert([
    { key: "allowed_domains", value: ["shop.example.com"], is_public: false },
    { key: "contextual_help", value: { fallback: true }, is_public: false },
  ]);

  const { data: collection, error } = await supabaseAdmin
    .from("collections")
    .insert({ name: `Help ${RUN}`, slug: `help-${RUN}` })
    .select("id")
    .single();
  if (error) throw error;
  made.collection = collection.id;
  const inserted = await supabaseAdmin.from("articles").insert(
    [
      {
        collection_id: made.collection,
        title: `How refunds work ${RUN}`,
        slug: `how-refunds-work-${RUN}`,
        summary: "When the money comes back.",
        status: "published",
        tags: [TAG],
      },
      {
        collection_id: made.collection,
        title: `Refunds in the chat only ${RUN}`,
        slug: `refunds-chat-only-${RUN}`,
        status: "published",
        visibility: "in_app",
        tags: [TAG],
      },
      {
        collection_id: made.collection,
        title: `Refunds draft ${RUN}`,
        slug: `refunds-draft-${RUN}`,
        status: "draft",
        tags: [TAG],
      },
      {
        collection_id: made.collection,
        title: `Wrangle the zorblax ${RUN}`,
        slug: `zorblax-${RUN}`,
        status: "published",
      },
    ],
    { defaultToNull: false },
  );
  if (inserted.error) throw inserted.error;

  const rules = await supabaseAdmin
    .from("help_rules")
    .insert([
      {
        name: `Bookings ${RUN}`,
        url_match: "matches",
        url_value: `/bookings-${RUN}/*`,
        filter: { tags: { any: [TAG] } },
      },
      {
        name: `Business billing ${RUN}`,
        url_match: "is",
        url_value: `/billing-${RUN}`,
        audience: "business",
        filter: { articles: [`zorblax-${RUN}`] },
      },
    ])
    .select("id");
  if (rules.error) throw rules.error;
  made.rules = rules.data.map((rule) => rule.id);
});

afterAll(async () => {
  await removePeople(people);
  await supabaseAdmin.from("help_rules").delete().in("id", made.rules);
  await supabaseAdmin.from("articles").delete().eq("collection_id", made.collection);
  await supabaseAdmin.from("collections").delete().eq("id", made.collection);
  await supabaseAdmin.from("settings").delete().in("key", ["allowed_domains", "contextual_help"]);
  if (savedSettings.length > 0) await supabaseAdmin.from("settings").upsert(savedSettings);
});

function get(query: string, origin?: string) {
  return listArticles(
    new Request(`http://localhost/api/articles?${query}`, {
      headers: origin ? { origin } : {},
    }),
  );
}

function post(
  handler: (request: Request) => Promise<Response>,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return handler(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const titles = async (response: Response) =>
  ((await response.json()) as { title: string }[]).map((article) => article.title);

describe("GET /api/articles", () => {
  it("lists the published articles a filter picks, with their addresses, and is kept a minute", async () => {
    const response = await get(`tags=${TAG}&limit=5`, "https://shop.example.com");
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://shop.example.com");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    const body = (await response.json()) as { title: string; url: string | null }[];
    expect(body).toEqual([
      {
        title: `How refunds work ${RUN}`,
        summary: "When the money comes back.",
        slug: `how-refunds-work-${RUN}`,
        url: expect.stringMatching(
          new RegExp(`/help/help-${RUN}/how-refunds-work-${RUN}$`),
        ) as string,
      },
      {
        title: `Refunds in the chat only ${RUN}`,
        summary: null,
        slug: `refunds-chat-only-${RUN}`,
        // Not on the public help center, so there is no page to link to.
        url: null,
      },
    ]);
  });

  it("refuses a site that is not one of the allowed domains, and answers a server", async () => {
    const refused = await get(`tags=${TAG}`, "https://evil.example");
    expect(refused.status).toBe(403);
    expect(refused.headers.get("access-control-allow-origin")).toBeNull();
    expect((await get(`tags=${TAG}`)).status).toBe(200);
  });

  it("answers an allowed site's preflight, and no other", async () => {
    const allowed = await preflight(
      new Request("http://localhost/api/articles", {
        method: "OPTIONS",
        headers: { origin: "https://shop.example.com" },
      }),
    );
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://shop.example.com");
    const other = await preflight(
      new Request("http://localhost/api/articles", {
        method: "OPTIONS",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("says what is wrong with a filter it cannot read", async () => {
    const response = await get("limit=500");
    expect(response.status).toBe(400);
  });
});

describe("POST /api/articles/search", () => {
  it("takes a filter too rich for an address", async () => {
    const response = await post(searchArticles, "/api/articles/search", {
      filter: { tags: { any: [TAG], none: ["nothing"] }, articles: [`zorblax-${RUN}`], limit: 3 },
    });
    expect(await titles(response)).toEqual([
      `Wrangle the zorblax ${RUN}`,
      `How refunds work ${RUN}`,
      `Refunds in the chat only ${RUN}`,
    ]);
  });

  it("refuses a body that is not a filter", async () => {
    const response = await post(searchArticles, "/api/articles/search", { filter: { limit: "x" } });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/articles/contextual", () => {
  it("lets a page's filter win over a rule that matches", async () => {
    const response = await post(pageHelp, "/api/articles/contextual", {
      page: { url: `https://app.example.com/bookings-${RUN}/1`, title: "Bookings" },
      filter: { articles: [`zorblax-${RUN}`] },
    });
    expect(await response.json()).toMatchObject({
      match: { kind: "filter" },
      fallback: null,
      articles: [{ slug: `zorblax-${RUN}` }],
    });
  });

  it("uses the first rule that matches a page with no filter", async () => {
    const response = await post(pageHelp, "/api/articles/contextual", {
      page: { url: `https://app.example.com/bookings-${RUN}/1`, title: "Bookings" },
    });
    const body = (await response.json()) as { match: unknown; articles: { slug: string }[] };
    expect(body.match).toEqual({ kind: "rule", id: made.rules[0], name: `Bookings ${RUN}` });
    expect(body.articles.map((article) => article.slug)).toEqual([
      `how-refunds-work-${RUN}`,
      `refunds-chat-only-${RUN}`,
    ]);
  });

  it("skips a rule for an audience the visitor is not in", async () => {
    // A guest has no audience, so the business rule does not apply and the title is searched.
    const response = await post(pageHelp, "/api/articles/contextual", {
      page: { url: `https://app.example.com/billing-${RUN}`, title: "Wrangling a zorblax" },
    });
    const body = (await response.json()) as { match: unknown; fallback: string; articles: unknown };
    expect(body.match).toBeNull();
    // Any word of the title counts, since a title is rarely all in one article.
    expect(body.fallback).toBe("Wrangling a zorblax");
    expect(body.articles).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: `zorblax-${RUN}` })]),
    );
  });

  it("finds nothing when the fallback is off", async () => {
    await supabaseAdmin
      .from("settings")
      .update({ value: { fallback: false } })
      .eq("key", "contextual_help");
    try {
      const response = await post(pageHelp, "/api/articles/contextual", {
        page: { url: "https://app.example.com/nowhere", title: `zorblax ${RUN}` },
      });
      expect(await response.json()).toEqual({ match: null, fallback: null, articles: [] });
    } finally {
      await supabaseAdmin
        .from("settings")
        .update({ value: { fallback: true } })
        .eq("key", "contextual_help");
    }
  });
});

describe("the help a conversation started with", () => {
  it("keeps the rule that matched, named by the server, in the conversation's context", async () => {
    const guest = await newGuest();
    people.push(guest);
    const response = await post(
      startConversation,
      "/api/conversations",
      {
        message: "Where is my refund?",
        contact: { name: "Ines Duarte", email: `ines.${RUN}@example.test` },
        help: { match: { kind: "rule", id: made.rules[0], name: "Made up" }, fallback: null },
      },
      guest.headers,
    );
    expect(response.status).toBe(201);
    const { conversationId } = (await response.json()) as { conversationId: string };
    const { data } = await supabaseAdmin
      .from("conversations")
      .select("context")
      .eq("id", conversationId)
      .single();
    expect(data?.context).toMatchObject({
      help: { match: { kind: "rule", id: made.rules[0], name: `Bookings ${RUN}` }, fallback: null },
    });
  });
});

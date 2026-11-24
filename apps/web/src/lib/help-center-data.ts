import "server-only";

import {
  createHelpwrenClient,
  type Article,
  type ArticleSummary,
  type Collection,
  type Database,
  type PublicSettings,
} from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { env } from "@/lib/env";
import { HELP_CENTER_KEEP_FOR, HELP_CENTER_TAG } from "@/lib/help-center-cache";
import { supabaseServerUrl } from "@/lib/supabase/server-url";

/**
 * The Helpwren client the public help center reads through: a visitor with no session, whoever
 * is asking. So a team member browsing the help center sees what the public sees, never a
 * draft.
 */
function visitor() {
  return createHelpwrenClient({
    supabase: createClient<Database>(supabaseServerUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  });
}

/**
 * Kept for a minute across visitors (`unstable_cache`), and asked once per request however many
 * parts of the page want it (`cache`). Saving clears it early; see `lib/help-center-cache.ts`.
 */
function kept<Args extends unknown[], Result>(
  name: string,
  read: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return cache(
    unstable_cache(read, ["help-center", name], {
      tags: [HELP_CENTER_TAG],
      revalidate: HELP_CENTER_KEEP_FOR,
    }),
  );
}

/** The brand and how the help center wears it. */
export const getHelpSettings = kept("settings", (): Promise<PublicSettings> =>
  visitor().settings.getPublic(),
);

/** A collection as the help center shows it: with only the articles listed there. */
export interface HelpCollection extends Collection {
  articles: ArticleSummary[];
}

/**
 * Everything the help center lists: each collection with its published articles, in order.
 * Articles shown only in the chat are left out, and so is a collection with nothing else.
 * One answer serves the list beside every page, the home page, a collection's page and the
 * sitemap.
 */
const readCollections = kept("collections", async (): Promise<HelpCollection[]> => {
  const helpwren = visitor();
  const [collections, articles] = await Promise.all([
    helpwren.collections.list(),
    helpwren.articles.list({ status: "published", visibility: "public", pageSize: 1000 }),
  ]);
  return collections
    .map((collection) => ({
      ...collection,
      articles: articles.items
        .filter((article) => article.collectionId === collection.id)
        .sort((first, second) => first.position - second.position),
    }))
    .filter((collection) => collection.articles.length > 0);
});

/**
 * What a frame lists for its audience: those articles and the ones for everyone, and only the
 * collections holding any. With no audience, all of them.
 */
export async function getHelpCollections(audience?: string): Promise<HelpCollection[]> {
  const collections = await readCollections();
  if (!audience) return collections;
  return collections
    .map((collection) => ({
      ...collection,
      articles: collection.articles.filter(
        ({ audiences }) => audiences.length === 0 || audiences.includes(audience),
      ),
    }))
    .filter((collection) => collection.articles.length > 0);
}

/** One published article by its slug, or `null`. Articles shown only in the chat count as missing. */
export const getHelpArticle = kept("article", async (slug: string): Promise<Article | null> => {
  const article = await visitor().articles.getBySlug(slug, { publishedOnly: true });
  return article?.visibility === "public" ? article : null;
});

/** What a search of the published articles finds, best match first. Never kept: there are too many questions. */
export function searchHelpArticles(query: string, audience?: string): Promise<ArticleSummary[]> {
  return visitor().articles.search(query, { visibility: "public", audience, limit: 20 });
}

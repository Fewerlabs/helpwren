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
import { cache } from "react";

import { env } from "@/lib/env";

/**
 * The Helpwren client the public help center reads through: a visitor with no session, whoever
 * is asking. So a team member browsing the help center sees what the public sees, never a
 * draft.
 */
function visitor() {
  return createHelpwrenClient({
    supabase: createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ),
  });
}

/**
 * The brand and how the help center wears it. Asked once per request, however many parts of
 * the page want it, and never kept longer: a saved change shows on the very next visit.
 */
export const getHelpSettings = cache((): Promise<PublicSettings> => visitor().settings.getPublic());

/** A collection as the help center shows it: with only the articles listed there. */
export interface HelpCollection extends Collection {
  articles: ArticleSummary[];
}

/**
 * Everything the help center lists: each collection with its published articles, in order.
 * Articles shown only in the chat are left out, and so is a collection with nothing else.
 * One answer serves the list beside every page, the home page, a collection's page and the
 * sitemap. Asked once per request.
 */
export const getHelpCollections = cache(async (): Promise<HelpCollection[]> => {
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

/** One published article by its slug, or `null`. Articles shown only in the chat count as missing. */
export const getHelpArticle = cache(async (slug: string): Promise<Article | null> => {
  const article = await visitor().articles.getBySlug(slug, { publishedOnly: true });
  return article?.visibility === "public" ? article : null;
});

/** What a search of the published articles finds, best match first. */
export function searchHelpArticles(query: string): Promise<ArticleSummary[]> {
  return visitor().articles.search(query, { visibility: "public", limit: 20 });
}

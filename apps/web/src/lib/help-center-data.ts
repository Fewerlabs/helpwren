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

import { env } from "@/lib/env";
import { HELP_CENTER_TAG } from "@/lib/help-center-cache";

/**
 * The Helpwren client the public help center reads through: a visitor with no session, whoever
 * is asking. So a team member browsing the help center sees what the public sees, never a
 * draft, and one answer can be kept for everybody.
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
 * How long an answer from the database is kept, in seconds. Saving an article or the branding
 * clears it at once (`refreshHelpCenter`), so this only bounds a change made some other way.
 */
const KEEP_FOR = 300;
const cached = { tags: [HELP_CENTER_TAG], revalidate: KEEP_FOR };

/** The brand and how the help center wears it. */
export const getHelpSettings = unstable_cache(
  (): Promise<PublicSettings> => visitor().settings.getPublic(),
  ["help-center", "settings"],
  cached,
);

/** A collection as the help center shows it: with only the articles listed there. */
export interface HelpCollection extends Collection {
  articles: ArticleSummary[];
}

/**
 * Everything the help center lists: each collection with its published articles, in order.
 * Articles shown only in the chat are left out, and so is a collection with nothing else.
 * One request serves the home page, every collection page and the sitemap.
 */
export const getHelpCollections = unstable_cache(
  async (): Promise<HelpCollection[]> => {
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
  },
  ["help-center", "collections"],
  cached,
);

/** One published article by its slug, or `null`. Articles shown only in the chat count as missing. */
export const getHelpArticle = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const article = await visitor().articles.getBySlug(slug, { publishedOnly: true });
    return article?.visibility === "public" ? article : null;
  },
  ["help-center", "article"],
  cached,
);

/** Search is asked afresh each time: there are too many possible questions to keep answers for. */
export function searchHelpArticles(query: string): Promise<ArticleSummary[]> {
  return visitor().articles.search(query, { visibility: "public", limit: 20 });
}

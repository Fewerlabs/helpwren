import "server-only";

import {
  createHelpwrenClient,
  helpRuleSchema,
  parseSettings,
  pickHelpFilter,
  ARTICLE_FILTER_LIMIT_DEFAULT,
  type ArticleFilter,
  type ArticleSummary,
  type Database,
  type HelpArticle,
  type HelpRule,
  type PageHelp,
} from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { z } from "zod";

import { env } from "@/lib/env";
import { HELP_CENTER_KEEP_FOR, HELP_CENTER_TAG } from "@/lib/help-center-cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerUrl } from "@/lib/supabase/server-url";

/**
 * Contextual help on the server: the articles a filter picks, the help for a page, and the
 * shape the public endpoints answer in. The rules and settings are kept for a minute under the
 * help center's tag, which saving a rule or an article clears. The articles themselves are
 * asked for each time: a filter is small, the database answers it from its indexes, and an
 * article added outside the app shows at once.
 */

/** As a visitor with no session: `find_articles` gives published articles to anyone. */
const visitor = createHelpwrenClient({
  supabase: createClient<Database>(supabaseServerUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
});

interface Setup {
  rules: HelpRule[];
  fallback: boolean;
  helpCenterUrl: string | null;
}

/** The team's rules, in order, whether to fall back to a search, and the help center's address. */
const readSetup = unstable_cache(
  async (): Promise<Setup> => {
    const [rules, settings] = await Promise.all([
      supabaseAdmin
        .from("help_rules")
        .select("id, name, url_match, url_value, audience, filter, enabled, position, updated_at")
        .order("position"),
      supabaseAdmin.from("settings").select("key, value"),
    ]);
    if (rules.error) throw rules.error;
    if (settings.error) throw settings.error;
    const parsed = parseSettings(settings.data);
    return {
      rules: z.array(helpRuleSchema).parse(rules.data),
      fallback: parsed.contextualHelp.fallback,
      helpCenterUrl: parsed.helpCenter.url ?? null,
    };
  },
  ["contextual-help", "setup"],
  { tags: [HELP_CENTER_TAG], revalidate: HELP_CENTER_KEEP_FOR },
);

/** Where an article is read on the help center, or `null` for one shown only in the chat. */
function articleUrl(article: ArticleSummary, helpCenterUrl: string | null): string | null {
  if (article.visibility !== "public" || !article.collection) return null;
  const base = helpCenterUrl ?? `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/help`;
  return `${base}/${article.collection.slug}/${article.slug}`;
}

function toHelpArticles(articles: ArticleSummary[], helpCenterUrl: string | null): HelpArticle[] {
  return articles.map((article) => ({
    title: article.title,
    summary: article.summary,
    slug: article.slug,
    url: articleUrl(article, helpCenterUrl),
  }));
}

/** The published articles a filter picks, as the public endpoints give them. */
export async function findHelpArticles(filter: ArticleFilter): Promise<HelpArticle[]> {
  const [articles, setup] = await Promise.all([visitor.articles.find(filter), readSetup()]);
  return toHelpArticles(articles, setup.helpCenterUrl);
}

/**
 * The audience of the person a request is from: what the install's identity adapter said for a
 * verified user. Guests and unverified users have none.
 */
export async function audienceOf(contactId: string | null): Promise<string | null> {
  if (!contactId) return null;
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("audience, verified")
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw error;
  return data?.verified ? data.audience : null;
}

export interface PageHelpRequest {
  page?: { url: string; title: string } | undefined;
  filter?: ArticleFilter | undefined;
  /** The visitor's, as the install's identity adapter said. */
  audience?: string | null | undefined;
  /** The one the page says its help is for. */
  pageAudience?: string | undefined;
}

/**
 * The help for a page. The page's own filter wins; otherwise the first rule that matches. When
 * that finds nothing, or nothing applies, and the install allows it, a search for the filter's
 * words or the page's title, with any word counting, so the chat rarely has nothing to offer.
 */
export async function resolvePageHelp(request: PageHelpRequest): Promise<PageHelp> {
  const setup = await readSetup();
  const match = pickHelpFilter({
    filter: request.filter,
    rules: setup.rules,
    url: request.page?.url,
    audience: request.audience,
    pageAudience: request.pageAudience,
  });
  const summary =
    match === null
      ? null
      : match.kind === "filter"
        ? { kind: "filter" as const, filter: match.filter }
        : { kind: "rule" as const, id: match.rule.id, name: match.rule.name };

  const found = match ? await visitor.articles.find(match.filter) : [];
  if (found.length > 0 || !setup.fallback) {
    return {
      match: summary,
      fallback: null,
      articles: toHelpArticles(found, setup.helpCenterUrl),
    };
  }

  const query = (match?.filter.q ?? request.page?.title ?? "").trim().slice(0, 200);
  if (!query) return { match: summary, fallback: null, articles: [] };
  const audience = match?.filter.audience ?? request.pageAudience;
  const fallbackFilter: ArticleFilter = {
    q: query,
    limit: match?.filter.limit ?? ARTICLE_FILTER_LIMIT_DEFAULT,
    ...(audience ? { audience } : {}),
    ...(match?.filter.locale ? { locale: match.filter.locale } : {}),
  };
  const searched = await visitor.articles.find(fallbackFilter, { anyWord: true });
  return {
    match: summary,
    fallback: searched.length > 0 ? query : null,
    articles: toHelpArticles(searched, setup.helpCenterUrl),
  };
}

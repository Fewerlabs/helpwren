import { z } from "zod";

import { slugSchema } from "./slug";

/**
 * Which help articles fit a page, as the page or a rule describes it. Every part is optional
 * and the parts combine with AND; `find_articles` in the database evaluates it, over published
 * articles only. The widget's own copy of this shape is `ArticleFilter` in
 * `packages/widget/src/protocol.ts`; keep the two in step.
 */

/** How the articles come: their set order, best match, latest change, or most found helpful. */
export const articleFilterSortSchema = z.enum(["position", "relevance", "updated", "popular"]);
export type ArticleFilterSort = z.infer<typeof articleFilterSortSchema>;

/** The most articles one filter returns, and how many when it does not say. */
export const ARTICLE_FILTER_LIMIT_MAX = 50;
export const ARTICLE_FILTER_LIMIT_DEFAULT = 5;

/** The most values in one list of a filter: collections, tags of one kind, pinned articles. */
const LIST_MAX = 20;

/** A language, such as `en` or `pt-BR`, kept in lower case as articles store it. */
export const localeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/);

/** A custom field's name, such as `plan` or `app_version`. */
export const fieldKeySchema = z.string().regex(/^[a-z0-9_]{1,40}$/);

/** A custom field's value. Numbers and true or false are compared as the text they print as. */
export const fieldValueSchema = z
  .union([z.string().trim().min(1).max(200), z.number(), z.boolean()])
  .transform(String)
  .pipe(z.string().min(1).max(200));

/** Who an audience is, as the install's identity adapter names it: `business`. */
export const audienceSchema = z.string().trim().toLowerCase().min(1).max(60);

const tagListSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(40))
  .min(1)
  .max(LIST_MAX)
  .transform((tags) => [...new Set(tags)]);

export const articleFilterSchema = z.object({
  /** A collection's slug, or several. */
  collection: z.union([slugSchema, z.array(slugSchema).min(1).max(LIST_MAX)]).optional(),
  /** Articles with any of these tags, all of them, or none of them. More than one may be set. */
  tags: z
    .object({
      any: tagListSchema.optional(),
      all: tagListSchema.optional(),
      none: tagListSchema.optional(),
    })
    .optional(),
  /** Words to search for in the title, summary, tags and body. */
  q: z.string().trim().min(1).max(200).optional(),
  /** Articles for everyone, or for this audience. */
  audience: audienceSchema.optional(),
  /** Articles in no particular language, or in this one. `en` takes `en-gb` too. */
  locale: localeSchema.optional(),
  /** Articles whose custom fields hold every one of these pairs. */
  fields: z
    .record(fieldKeySchema, fieldValueSchema)
    .refine((fields) => Object.keys(fields).length <= LIST_MAX)
    .optional(),
  /** Articles to put first, by slug, in this order. With nothing else, only these. */
  articles: z.array(slugSchema).min(1).max(LIST_MAX).optional(),
  sort: articleFilterSortSchema.optional(),
  /** How many articles at most. Default 5. */
  limit: z.number().int().min(1).max(ARTICLE_FILTER_LIMIT_MAX).optional(),
});

/** A filter as a page or a rule writes it. */
export type ArticleFilterInput = z.input<typeof articleFilterSchema>;
/** A filter once checked and cleaned up: tags in lower case, field values as text. */
export type ArticleFilter = z.output<typeof articleFilterSchema>;

/** Whether a filter says anything at all. An empty one picks every published article. */
export function isEmptyFilter(filter: ArticleFilter): boolean {
  return Object.values(filter).every((value) => value === undefined);
}

const paramsSchema = z.object({
  tag_mode: z.enum(["any", "all", "none"]),
  filter: articleFilterSchema,
});

export type FilterParseResult =
  { success: true; data: ArticleFilter } | { success: false; error: z.ZodError };

/** A comma-separated list from an address, without the empty pieces. */
function list(value: string | null): string[] | undefined {
  const items = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items?.length ? items : undefined;
}

/**
 * A filter from an address's query, for `GET /api/articles`:
 *
 * `?collection=bookings&tags=refunds,cancellations&tag_mode=any&q=cancel&audience=business`
 * `&locale=en&field.plan=pro&articles=how-refunds-work&sort=position&limit=5`
 *
 * `tag_mode` is `any` (the default), `all` or `none`. Each custom field is `field.<name>`.
 */
export function parseArticleFilterParams(params: URLSearchParams): FilterParseResult {
  const mode = params.get("tag_mode") ?? "any";
  const tags = list(params.get("tags"));
  const collections = list(params.get("collection"));
  const fields = Object.fromEntries(
    [...params.entries()]
      .filter(([key]) => key.startsWith("field."))
      .map(([key, value]) => [key.slice("field.".length), value]),
  );
  const limit = params.get("limit");
  const parsed = paramsSchema.safeParse({
    tag_mode: mode,
    filter: {
      collection: collections?.length === 1 ? collections[0] : collections,
      tags: tags ? { [mode]: tags } : undefined,
      q: params.get("q") ?? undefined,
      audience: params.get("audience") ?? undefined,
      locale: params.get("locale") ?? undefined,
      fields: Object.keys(fields).length > 0 ? fields : undefined,
      articles: list(params.get("articles")),
      sort: params.get("sort") ?? undefined,
      limit: limit === null ? undefined : Number(limit),
    },
  });
  return parsed.success
    ? { success: true, data: parsed.data.filter }
    : { success: false, error: parsed.error };
}

const sortNames: Record<ArticleFilterSort, string> = {
  position: "in their set order",
  relevance: "best match first",
  updated: "latest change first",
  popular: "most helpful first",
};

/** What a filter picks, in a few short phrases, for the team: `Tags any of refunds`. */
export function describeArticleFilter(filter: ArticleFilter): string[] {
  const parts: string[] = [];
  if (filter.articles) parts.push(`Articles ${filter.articles.join(", ")} first`);
  if (filter.collection) {
    const collections = [filter.collection].flat();
    parts.push(
      `${collections.length === 1 ? "Collection" : "Collections"} ${collections.join(", ")}`,
    );
  }
  if (filter.tags?.any) parts.push(`Tags any of ${filter.tags.any.join(", ")}`);
  if (filter.tags?.all) parts.push(`Tags all of ${filter.tags.all.join(", ")}`);
  if (filter.tags?.none) parts.push(`Tags none of ${filter.tags.none.join(", ")}`);
  if (filter.q) parts.push(`Search “${filter.q}”`);
  if (filter.audience) parts.push(`Audience ${filter.audience}`);
  if (filter.locale) parts.push(`Language ${filter.locale}`);
  for (const [key, value] of Object.entries(filter.fields ?? {})) parts.push(`${key} is ${value}`);
  if (filter.sort) parts.push(sortNames[filter.sort]);
  if (filter.limit) parts.push(`limit ${String(filter.limit)}`);
  return parts.length > 0 ? parts : ["Every published article"];
}

/**
 * A help article as the contextual help endpoints give it: enough to list it and link to it.
 * `url` is its page on the help center, or `null` for an article shown only in the chat.
 */
export const helpArticleSchema = z.object({
  title: z.string(),
  summary: z.string().nullable(),
  slug: z.string(),
  url: z.url().nullable(),
});
export type HelpArticle = z.infer<typeof helpArticleSchema>;

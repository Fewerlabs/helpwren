import { z } from "zod";

import { type Api } from "./api";
import {
  articleFilterSchema,
  audienceSchema,
  fieldKeySchema,
  localeSchema,
  type ArticleFilterInput,
} from "./article-filter";
import { type Database } from "./database.types";
import { HelpwrenError } from "./errors";
import {
  pageHelpInputSchema,
  pageHelpSchema,
  type PageHelp,
  type PageHelpInput,
} from "./help-rules";
import { EMPTY_RICH_TEXT, richTextSchema } from "./rich-text";
import { insertWithFreeSlug, slugify, slugSchema } from "./slug";
import { type HelpwrenSupabaseClient } from "./supabase";

export const articleStatusSchema = z.enum(["draft", "published"]);
export type ArticleStatus = z.infer<typeof articleStatusSchema>;

/** Where a published article is listed: everywhere, or only inside the chat. */
export const articleVisibilitySchema = z.enum(["public", "in_app"]);
export type ArticleVisibility = z.infer<typeof articleVisibilitySchema>;

/** The most tags one article carries. */
export const ARTICLE_TAGS_MAX = 20;

/** A free label on an article, such as `refunds`: lower case, so `iOS` and `ios` are one tag. */
export const articleTagSchema = z.string().trim().toLowerCase().min(1).max(40);

/** The most audiences and custom fields one article carries. */
export const ARTICLE_AUDIENCES_MAX = 10;
export const ARTICLE_FIELDS_MAX = 20;

/** An article's custom fields: a short text value for each name, such as `{ plan: "pro" }`. */
export const articleFieldsSchema = z
  .record(fieldKeySchema, z.string().trim().min(1).max(200))
  .refine((fields) => Object.keys(fields).length <= ARTICLE_FIELDS_MAX);

const summaryRowSchema = z.object({
  id: z.uuid(),
  collection_id: z.uuid().nullable(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable(),
  status: articleStatusSchema,
  position: z.number().int(),
  author_id: z.uuid().nullable(),
  author_name: z.string().nullable(),
  author_photo: z.string().nullable(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
  tags: z.array(z.string()),
  visibility: articleVisibilitySchema,
  featured: z.boolean(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  audiences: z.array(z.string()),
  locale: z.string().nullable(),
  fields: z.record(z.string(), z.string()),
  collection: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }).nullable(),
});

type SummaryRow = z.infer<typeof summaryRowSchema>;

function toSummary(row: SummaryRow) {
  return {
    id: row.id,
    collectionId: row.collection_id,
    /** The collection it is in, when the caller can read it. A draft may have none. */
    collection: row.collection,
    title: row.title,
    /** Its part of the address: `/help/{collection slug}/{slug}`. */
    slug: row.slug,
    summary: row.summary,
    status: row.status,
    /** Its place in its collection, lowest first. */
    position: row.position,
    authorId: row.author_id,
    /** Who wrote it, as readers see it. `null` once its author has left the team. */
    author: row.author_name ? { name: row.author_name, photo: row.author_photo } : null,
    /** When it was first published. */
    publishedAt: row.published_at,
    /** When its words last changed. */
    updatedAt: row.updated_at,
    tags: row.tags,
    /** `in_app` articles are left off the public help center and shown only in the chat. */
    visibility: row.visibility,
    /** Put forward on the help center's home page and in the chat's suggestions. */
    featured: row.featured,
    /** A title for search engines and shared links, when it should differ from the title. */
    metaTitle: row.meta_title,
    /** A description for search engines, when it should differ from the summary. */
    metaDescription: row.meta_description,
    /** Who it is for, as the identity adapter names audiences. Empty: everyone. */
    audiences: row.audiences,
    /** Its language, such as `en`. `null`: not tied to one. */
    locale: row.locale,
    /** The team's own keys and values, such as `{ plan: "pro" }`, for contextual help. */
    fields: row.fields,
  };
}

/** An article without its body, for lists and search results. */
export const articleSummarySchema = summaryRowSchema.transform(toSummary);
export type ArticleSummary = z.infer<typeof articleSummarySchema>;

/** A whole article. */
export const articleSchema = summaryRowSchema
  .extend({ body: richTextSchema })
  .transform(({ body, ...row }) => ({ ...toSummary(row), body }));
export type Article = z.infer<typeof articleSchema>;

const titleSchema = z.string().trim().min(1).max(160);
const summarySchema = z.string().trim().max(300);

export const articleInputSchema = z.object({
  title: titleSchema,
  /** Empty for none. */
  summary: summarySchema.optional(),
  body: richTextSchema.optional(),
  /** `null` for a draft that is not in a collection yet. */
  collectionId: z.uuid().nullable().optional(),
  /** Made from the title when left out. */
  slug: slugSchema.optional(),
  tags: z
    .array(articleTagSchema)
    .max(ARTICLE_TAGS_MAX)
    .transform((tags) => [...new Set(tags)])
    .optional(),
  visibility: articleVisibilitySchema.optional(),
  featured: z.boolean().optional(),
  /** Empty for none. */
  metaTitle: z.string().trim().max(70).optional(),
  /** Empty for none. */
  metaDescription: z.string().trim().max(200).optional(),
  /** The team member credited with it. Whoever makes an article is its author to begin with. */
  authorId: z.uuid().optional(),
  audiences: z
    .array(audienceSchema)
    .max(ARTICLE_AUDIENCES_MAX)
    .transform((audiences) => [...new Set(audiences)])
    .optional(),
  /** `null` for an article not tied to a language. */
  locale: localeSchema.nullable().optional(),
  fields: articleFieldsSchema.optional(),
});
export type ArticleInput = z.input<typeof articleInputSchema>;

export const articleChangesSchema = articleInputSchema.partial();
export type ArticleChanges = z.input<typeof articleChangesSchema>;

export interface ListArticlesOptions {
  /** Only this collection's articles, in their order. `null` for those in no collection. */
  collectionId?: string | null | undefined;
  status?: ArticleStatus | undefined;
  /** Only articles carrying at least one of these tags. */
  tags?: readonly string[] | undefined;
  /** Only articles credited to one of these team members. */
  authorIds?: readonly string[] | undefined;
  visibility?: ArticleVisibility | undefined;
  /** Only the articles put forward, or only the rest. */
  featured?: boolean | undefined;
  /** Words to find in the title, summary or body. Results come best match first. */
  search?: string | undefined;
  /** Which page, starting at 1. */
  page?: number | undefined;
  /** How many to a page. Default 25. */
  pageSize?: number | undefined;
}

export interface ArticlesPage {
  items: ArticleSummary[];
  /** How many articles match, across every page. */
  total: number;
}

export interface SearchArticlesOptions {
  /** The most to return. Default 10. */
  limit?: number | undefined;
  /** Also find drafts, which only the team can read anyway. Default: published only. */
  includeDrafts?: boolean | undefined;
  /** Only articles listed here: `public` for the help center. Default: both. */
  visibility?: ArticleVisibility | undefined;
}

export interface FindArticlesOptions {
  /**
   * An article needs only one of the words in `q`, not all of them. For searching a page's
   * title, which is rarely all in one article. Default false.
   */
  anyWord?: boolean | undefined;
}

export interface GetArticleOptions {
  /** Only if it is published, even for a team member who could read the draft. */
  publishedOnly?: boolean | undefined;
}

export type CreateArticleResult =
  { ok: true; article: Article } | { ok: false; reason: "forbidden" | "slug_taken" };

export type ChangeArticleResult =
  | { ok: true; article: Article }
  | {
      ok: false;
      /**
       * `slug_locked`: it is published, and a published address stays put.
       * `needs_collection`: a published article has to be in a collection.
       */
      reason: "not_found" | "slug_taken" | "slug_locked" | "needs_collection";
    };

/** How many of the articles asked for were changed. The rest were gone, or could not be. */
export interface ChangeArticlesResult {
  changed: number;
}

export type RemoveArticleResult = { ok: true } | { ok: false; reason: "not_found" };
export type ArticleFeedbackResult =
  { ok: true } | { ok: false; reason: "not_found" | "rate_limited" };

/** How many readers said an article helped, and how many said it did not. */
export interface FeedbackTotals {
  helpful: number;
  unhelpful: number;
}

/** Where pictures in articles are kept, and what one may be. The bucket enforces the same. */
const IMAGE_BUCKET = "articles";
export const ARTICLE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ARTICLE_IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

/** A picture already uploaded for an article, to use again. */
export interface ArticleImage {
  /** Its public address, to put in a body. */
  url: string;
  name: string;
  createdAt: string | null;
}

export interface ArticleImagePage {
  images: ArticleImage[];
  /** Where the next page starts, or `null` at the end. */
  nextOffset: number | null;
}

export type UploadArticleImageResult =
  { ok: true; url: string } | { ok: false; reason: "forbidden" | "too_large" | "unsupported" };

const SUMMARY_COLUMNS =
  "id, collection_id, title, slug, summary, status, position, author_id, author_name, author_photo, published_at, updated_at, tags, visibility, featured, meta_title, meta_description, audiences, locale, fields, collection:collections(id, name, slug)";
const COLUMNS = `${SUMMARY_COLUMNS}, body`;

/** Postgres's codes for what the database refuses. `HW409` is our own, for a locked slug. */
const NOT_ALLOWED = "42501";
const TAKEN = "23505";
const CHECK_FAILED = "23514";
const LOCKED = "HW409";

function refusal(code: string | undefined) {
  if (code === TAKEN) return "slug_taken" as const;
  if (code === LOCKED) return "slug_locked" as const;
  if (code === CHECK_FAILED) return "needs_collection" as const;
  return undefined;
}

type Metadata = Pick<
  z.infer<typeof articleChangesSchema>,
  | "tags"
  | "visibility"
  | "featured"
  | "metaTitle"
  | "metaDescription"
  | "audiences"
  | "locale"
  | "fields"
>;

/** The parts of an article besides its words, as columns. Anything left out is left alone. */
function metadata(input: Metadata) {
  const values: Database["public"]["Tables"]["articles"]["Update"] = {};
  if (input.tags !== undefined) values.tags = input.tags;
  if (input.visibility !== undefined) values.visibility = input.visibility;
  if (input.featured !== undefined) values.featured = input.featured;
  if (input.metaTitle !== undefined) values.meta_title = input.metaTitle ? input.metaTitle : null;
  if (input.metaDescription !== undefined) {
    values.meta_description = input.metaDescription ? input.metaDescription : null;
  }
  if (input.audiences !== undefined) values.audiences = input.audiences;
  if (input.locale !== undefined) values.locale = input.locale;
  if (input.fields !== undefined) values.fields = input.fields;
  return values;
}

export function createArticles(supabase: HelpwrenSupabaseClient, api: Api) {
  async function change(
    id: string,
    values: Database["public"]["Tables"]["articles"]["Update"],
    failure: string,
  ): Promise<ChangeArticleResult> {
    const { data, error } = await supabase
      .from("articles")
      .update(values)
      .eq("id", id)
      .select(COLUMNS);
    if (error) {
      const reason = refusal(error.code);
      if (reason) return { ok: false, reason };
      throw new HelpwrenError(failure, { cause: error });
    }
    // The access rules hide the row from anyone who may not change it, so nothing comes back.
    const [row] = data;
    return row
      ? { ok: true, article: articleSchema.parse(row) }
      : { ok: false, reason: "not_found" };
  }

  /** One change to many articles, in one request. Rows hidden by the access rules are skipped. */
  async function changeMany(
    ids: readonly string[],
    values: Database["public"]["Tables"]["articles"]["Update"],
    failure: string,
    inCollectionOnly = false,
  ): Promise<ChangeArticlesResult> {
    const list = z.array(z.uuid()).parse(ids);
    if (list.length === 0) return { changed: 0 };
    let request = supabase.from("articles").update(values).in("id", list);
    if (inCollectionOnly) request = request.not("collection_id", "is", null);
    const { data, error } = await request.select("id");
    if (error) throw new HelpwrenError(failure, { cause: error });
    return { changed: data.length };
  }

  return {
    /**
     * Articles without their bodies. A visitor gets published ones; the team gets drafts too.
     * Within one collection they come in their set order, otherwise latest change first, and a
     * search comes best match first.
     */
    async list(options: ListArticlesOptions = {}): Promise<ArticlesPage> {
      const pageSize = options.pageSize ?? 25;
      const from = ((options.page ?? 1) - 1) * pageSize;
      const search = options.search?.trim();

      let query = search
        ? supabase
            .rpc("search_articles", { query: search }, { count: "exact" })
            .select(SUMMARY_COLUMNS)
        : supabase.from("articles").select(SUMMARY_COLUMNS, { count: "exact" });
      if (options.collectionId === null) query = query.is("collection_id", null);
      else if (options.collectionId) query = query.eq("collection_id", options.collectionId);
      if (options.status) query = query.eq("status", options.status);
      if (options.tags?.length) query = query.overlaps("tags", [...options.tags]);
      if (options.authorIds?.length) query = query.in("author_id", [...options.authorIds]);
      if (options.visibility) query = query.eq("visibility", options.visibility);
      if (options.featured !== undefined) query = query.eq("featured", options.featured);
      if (!search) {
        query = options.collectionId
          ? query.order("position").order("title")
          : query.order("updated_at", { ascending: false });
      }

      const { data, count, error } = await query.range(from, from + pageSize - 1);
      if (error) throw new HelpwrenError("Could not load the articles.", { cause: error });
      return { items: z.array(articleSummarySchema).parse(data), total: count ?? data.length };
    },

    /** Finds articles by the words given, best match first. */
    async search(query: string, options: SearchArticlesOptions = {}): Promise<ArticleSummary[]> {
      const text = query.trim();
      if (!text) return [];
      let request = supabase.rpc("search_articles", { query: text }).select(SUMMARY_COLUMNS);
      if (!options.includeDrafts) request = request.eq("status", "published");
      if (options.visibility) request = request.eq("visibility", options.visibility);
      const { data, error } = await request.limit(options.limit ?? 10);
      if (error) throw new HelpwrenError("Could not search the articles.", { cause: error });
      return z.array(articleSummarySchema).parse(data);
    },

    /**
     * The published articles a filter picks, best first, evaluated by the database. Anyone may
     * ask, with or without a session; drafts are never included.
     */
    async find(
      filter: ArticleFilterInput = {},
      options: FindArticlesOptions = {},
    ): Promise<ArticleSummary[]> {
      const { data, error } = await supabase
        .rpc("find_articles", {
          filter: articleFilterSchema.parse(filter),
          any_word: options.anyWord ?? false,
        })
        .select(SUMMARY_COLUMNS);
      if (error) throw new HelpwrenError("Could not find the articles.", { cause: error });
      return z.array(articleSummarySchema).parse(data);
    },

    /**
     * The help for the page the chat is on, from the app's server: the page's own filter, or
     * the first of the team's rules that matches, or a search on the page's title when neither
     * finds anything and the install allows it.
     */
    async forPage(input: PageHelpInput): Promise<PageHelp> {
      const result = await api.post(
        "/api/articles/contextual",
        pageHelpInputSchema.parse(input),
        pageHelpSchema,
      );
      if (result.ok) return result.data;
      throw new HelpwrenError(`Could not load the help for this page: ${result.message}`);
    },

    /** One article with its body, or `null` if there is none the caller can read. */
    async get(id: string): Promise<Article | null> {
      if (!z.uuid().safeParse(id).success) return null;
      const { data, error } = await supabase
        .from("articles")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new HelpwrenError("Could not load the article.", { cause: error });
      return data ? articleSchema.parse(data) : null;
    },

    /** One article by its slug, or `null` if there is none the caller can read. */
    async getBySlug(slug: string, options: GetArticleOptions = {}): Promise<Article | null> {
      const parsed = slugSchema.safeParse(slug);
      if (!parsed.success) return null;
      let query = supabase.from("articles").select(COLUMNS).eq("slug", parsed.data);
      if (options.publishedOnly) query = query.eq("status", "published");
      const { data, error } = await query.maybeSingle();
      if (error) throw new HelpwrenError("Could not load the article.", { cause: error });
      return data ? articleSchema.parse(data) : null;
    },

    /** How many articles the caller can read, and how many of them are in no collection. */
    async counts(): Promise<{ total: number; uncategorised: number }> {
      const [all, loose] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .is("collection_id", null),
      ]);
      const error = all.error ?? loose.error;
      if (error) throw new HelpwrenError("Could not count the articles.", { cause: error });
      return { total: all.count ?? 0, uncategorised: loose.count ?? 0 };
    },

    /** Every tag in use, in alphabetical order, for a filter or as suggestions. */
    async tags(): Promise<string[]> {
      const { data, error } = await supabase
        .from("articles")
        .select("tags")
        .not("tags", "eq", "{}");
      if (error) throw new HelpwrenError("Could not load the tags.", { cause: error });
      return [...new Set(data.flatMap((row) => row.tags))].sort((a, b) => a.localeCompare(b));
    },

    /** Every audience articles are for, in alphabetical order, as suggestions. */
    async audiences(): Promise<string[]> {
      const { data, error } = await supabase
        .from("articles")
        .select("audiences")
        .not("audiences", "eq", "{}");
      if (error) throw new HelpwrenError("Could not load the audiences.", { cause: error });
      return [...new Set(data.flatMap((row) => row.audiences))].sort((a, b) => a.localeCompare(b));
    },

    /** Starts a draft, at the end of its collection. For the team. */
    async create(input: ArticleInput): Promise<CreateArticleResult> {
      const { slug, summary, collectionId, body, title, ...rest } = articleInputSchema.parse(input);
      const row: Omit<Database["public"]["Tables"]["articles"]["Insert"], "slug"> = {
        title,
        summary: summary === undefined || summary === "" ? null : summary,
        body: body ?? EMPTY_RICH_TEXT,
        collection_id: collectionId ?? null,
        ...metadata(rest),
      };
      const insert = (candidate: string) =>
        supabase
          .from("articles")
          .insert({ ...row, slug: candidate })
          .select(COLUMNS)
          .single();
      // A slug the caller chose is theirs to fix if taken; one made from the title finds a gap.
      const { data, error } = slug
        ? await insert(slug)
        : await insertWithFreeSlug(slugify(title) || "article", insert);
      if (error) {
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
        if (error.code === TAKEN) return { ok: false, reason: "slug_taken" };
        throw new HelpwrenError("Could not make the article.", { cause: error });
      }
      return { ok: true, article: articleSchema.parse(data) };
    },

    /**
     * Changes the parts given and leaves the rest. The slug never follows the title: it changes
     * only when given here, and only while the article is a draft. For the team.
     */
    async update(id: string, changes: ArticleChanges): Promise<ChangeArticleResult> {
      const parsed = articleChangesSchema.parse(changes);
      const values: Database["public"]["Tables"]["articles"]["Update"] = {};
      if (parsed.title !== undefined) values.title = parsed.title;
      if (parsed.summary !== undefined) values.summary = parsed.summary ? parsed.summary : null;
      if (parsed.body !== undefined) values.body = parsed.body;
      if (parsed.collectionId !== undefined) values.collection_id = parsed.collectionId;
      if (parsed.slug !== undefined) values.slug = parsed.slug;
      Object.assign(values, metadata(parsed));
      if (parsed.authorId !== undefined) values.author_id = parsed.authorId;
      return change(id, values, "Could not save the article.");
    },

    /** Makes an article public. It has to be in a collection. For the team. */
    publish(id: string): Promise<ChangeArticleResult> {
      return change(id, { status: "published" }, "Could not publish the article.");
    },

    /** Takes an article back to a draft, which only the team can read. */
    unpublish(id: string): Promise<ChangeArticleResult> {
      return change(id, { status: "draft" }, "Could not unpublish the article.");
    },

    /** Puts articles in the order of the ids given, within their collection. For the team. */
    async reorder(ids: readonly string[]): Promise<void> {
      const { error } = await supabase.rpc("reorder_articles", {
        ids: z.array(z.uuid()).parse(ids),
      });
      if (error) throw new HelpwrenError("Could not reorder the articles.", { cause: error });
    },

    /**
     * Publishes many articles at once. An article in no collection cannot be published, so it
     * is left a draft; `changed` says how many were published. For the team.
     */
    publishMany(ids: readonly string[]): Promise<ChangeArticlesResult> {
      return changeMany(ids, { status: "published" }, "Could not publish the articles.", true);
    },

    /** Takes many articles back to drafts at once. For the team. */
    unpublishMany(ids: readonly string[]): Promise<ChangeArticlesResult> {
      return changeMany(ids, { status: "draft" }, "Could not unpublish the articles.");
    },

    /** Moves many articles into one collection, at the end of it. For the team. */
    moveMany(ids: readonly string[], collectionId: string): Promise<ChangeArticlesResult> {
      return changeMany(
        ids,
        { collection_id: z.uuid().parse(collectionId) },
        "Could not move the articles.",
      );
    },

    /** Removes many articles for good, with what readers said about them. For the team. */
    async removeMany(ids: readonly string[]): Promise<ChangeArticlesResult> {
      const list = z.array(z.uuid()).parse(ids);
      if (list.length === 0) return { changed: 0 };
      const { data, error } = await supabase.from("articles").delete().in("id", list).select("id");
      if (error) throw new HelpwrenError("Could not remove the articles.", { cause: error });
      return { changed: data.length };
    },

    /** Removes an article for good, with what readers said about it. For the team. */
    async remove(id: string): Promise<RemoveArticleResult> {
      const { data, error } = await supabase.from("articles").delete().eq("id", id).select("id");
      if (error) throw new HelpwrenError("Could not remove the article.", { cause: error });
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },

    /** Records a reader's answer to "Was this helpful?" on a published article. */
    async sendFeedback(articleId: string, helpful: boolean): Promise<ArticleFeedbackResult> {
      // Through the app's server, which limits how often one network may answer.
      const result = await api.post(
        `/api/articles/${z.uuid().parse(articleId)}/feedback`,
        { helpful },
        z.unknown(),
      );
      if (result.ok) return { ok: true };
      if (result.code === "not_found" || result.code === "rate_limited") {
        return { ok: false, reason: result.code };
      }
      throw new HelpwrenError(`Could not record the answer: ${result.message}`);
    },

    /** What readers answered, by article id. Articles nobody has rated are left out. For the team. */
    async feedbackTotals(): Promise<Record<string, FeedbackTotals>> {
      const { data, error } = await supabase
        .from("article_feedback_totals")
        .select("article_id, helpful, unhelpful");
      if (error) throw new HelpwrenError("Could not load the feedback.", { cause: error });
      const rows = z
        .array(z.object({ article_id: z.uuid(), helpful: z.number(), unhelpful: z.number() }))
        .parse(data);
      return Object.fromEntries(
        rows.map((row) => [row.article_id, { helpful: row.helpful, unhelpful: row.unhelpful }]),
      );
    },

    /**
     * Stores a picture for an article and gives back its public address, to put in the body.
     * For the team.
     */
    async uploadImage(file: Blob): Promise<UploadArticleImageResult> {
      const extension = (ARTICLE_IMAGE_TYPES as Record<string, string | undefined>)[file.type];
      if (!extension) return { ok: false, reason: "unsupported" };
      if (file.size > ARTICLE_IMAGE_MAX_BYTES) return { ok: false, reason: "too_large" };

      const path = `${crypto.randomUUID()}.${extension}`;
      const bucket = supabase.storage.from(IMAGE_BUCKET);
      const { error } = await bucket.upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) {
        // Storage reports a refusal by the access rules as a 403.
        if ("statusCode" in error && String(error.statusCode) === "403") {
          return { ok: false, reason: "forbidden" };
        }
        throw new HelpwrenError("Could not store the picture.", { cause: error });
      }
      return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
    },

    /**
     * The pictures already uploaded for articles, newest first, a page at a time, so one can be
     * used again. For the team.
     */
    async listImages({ offset = 0, limit = 48 }: { offset?: number; limit?: number } = {}) {
      const bucket = supabase.storage.from(IMAGE_BUCKET);
      // One more than asked for says whether there is another page.
      const { data, error } = await bucket.list("", {
        offset,
        limit: limit + 1,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw new HelpwrenError("Could not load the pictures.", { cause: error });
      const files = data.filter((file) => file.id !== null && !file.name.startsWith("."));
      const page: ArticleImagePage = {
        images: files.slice(0, limit).map((file) => ({
          url: bucket.getPublicUrl(file.name).data.publicUrl,
          name: file.name,
          createdAt: file.created_at ?? null,
        })),
        nextOffset: data.length > limit ? offset + limit : null,
      };
      return page;
    },
  };
}

export type ArticlesApi = ReturnType<typeof createArticles>;

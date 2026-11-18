import { z } from "zod";

import { type Database } from "./database.types";
import { HelpwrenError } from "./errors";
import { EMPTY_RICH_TEXT, richTextSchema } from "./rich-text";
import { insertWithFreeSlug, slugify, slugSchema } from "./slug";
import { type HelpwrenSupabaseClient } from "./supabase";

export const articleStatusSchema = z.enum(["draft", "published"]);
export type ArticleStatus = z.infer<typeof articleStatusSchema>;

const summaryRowSchema = z.object({
  id: z.uuid(),
  collection_id: z.uuid().nullable(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullable(),
  status: articleStatusSchema,
  position: z.number().int(),
  author_id: z.uuid().nullable(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
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
    /** When it was first published. */
    publishedAt: row.published_at,
    /** When its words last changed. */
    updatedAt: row.updated_at,
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
});
export type ArticleInput = z.input<typeof articleInputSchema>;

export const articleChangesSchema = articleInputSchema.partial();
export type ArticleChanges = z.input<typeof articleChangesSchema>;

export interface ListArticlesOptions {
  /** Only this collection's articles, in their order. `null` for those in no collection. */
  collectionId?: string | null | undefined;
  status?: ArticleStatus | undefined;
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

export type RemoveArticleResult = { ok: true } | { ok: false; reason: "not_found" };
export type ArticleFeedbackResult = { ok: true } | { ok: false; reason: "not_found" };

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

export type UploadArticleImageResult =
  { ok: true; url: string } | { ok: false; reason: "forbidden" | "too_large" | "unsupported" };

const SUMMARY_COLUMNS =
  "id, collection_id, title, slug, summary, status, position, author_id, published_at, updated_at, collection:collections(id, name, slug)";
const COLUMNS = `${SUMMARY_COLUMNS}, body`;

/** Postgres's codes for what the database refuses. `HW409` is our own, for a locked slug. */
const NOT_ALLOWED = "42501";
const TAKEN = "23505";
const CHECK_FAILED = "23514";
const NO_SUCH_ROW = "23503";
const LOCKED = "HW409";

function refusal(code: string | undefined) {
  if (code === TAKEN) return "slug_taken" as const;
  if (code === LOCKED) return "slug_locked" as const;
  if (code === CHECK_FAILED) return "needs_collection" as const;
  return undefined;
}

export function createArticles(supabase: HelpwrenSupabaseClient) {
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
      const { data, error } = await request.limit(options.limit ?? 10);
      if (error) throw new HelpwrenError("Could not search the articles.", { cause: error });
      return z.array(articleSummarySchema).parse(data);
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

    /** Starts a draft, at the end of its collection. For the team. */
    async create(input: ArticleInput): Promise<CreateArticleResult> {
      const { slug, summary, collectionId, body, title } = articleInputSchema.parse(input);
      const row = {
        title,
        summary: summary === undefined || summary === "" ? null : summary,
        body: body ?? EMPTY_RICH_TEXT,
        collection_id: collectionId ?? null,
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

    /** Removes an article for good, with what readers said about it. For the team. */
    async remove(id: string): Promise<RemoveArticleResult> {
      const { data, error } = await supabase.from("articles").delete().eq("id", id).select("id");
      if (error) throw new HelpwrenError("Could not remove the article.", { cause: error });
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },

    /** Records a reader's answer to "Was this helpful?" on a published article. */
    async sendFeedback(articleId: string, helpful: boolean): Promise<ArticleFeedbackResult> {
      const { error } = await supabase
        .from("article_feedback")
        .insert({ article_id: z.uuid().parse(articleId), helpful });
      if (error) {
        // Not published, or not there at all: either way there is nothing to rate.
        if (error.code === NOT_ALLOWED || error.code === NO_SUCH_ROW) {
          return { ok: false, reason: "not_found" };
        }
        throw new HelpwrenError("Could not record the answer.", { cause: error });
      }
      return { ok: true };
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
  };
}

export type ArticlesApi = ReturnType<typeof createArticles>;

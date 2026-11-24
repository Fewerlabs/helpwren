import { z } from "zod";

import { forAudience } from "./article-filter";
import { type Database } from "./database.types";
import { HelpwrenError } from "./errors";
import { insertWithFreeSlug, slugify, slugSchema } from "./slug";
import { type HelpwrenSupabaseClient } from "./supabase";

const collectionRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  position: z.number().int(),
  updated_at: z.string(),
  articles: z.array(z.object({ count: z.number().int() })),
});

/** A group of articles on one subject, such as "Getting started". */
export const collectionSchema = collectionRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  /** Its part of the address: `/help/{slug}`. */
  slug: row.slug,
  description: row.description,
  /** The name of any Phosphor icon, such as `book-open`. Older names Phosphor renamed still draw. */
  icon: row.icon,
  position: row.position,
  updatedAt: row.updated_at,
  /** How many of its articles the caller can read: published ones, and drafts for the team. */
  articleCount: row.articles[0]?.count ?? 0,
}));

export type Collection = z.infer<typeof collectionSchema>;

const nameSchema = z.string().trim().min(1).max(80);
const descriptionSchema = z.string().trim().max(300);
const iconSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);
const collectionSlugSchema = slugSchema.max(80);

export const collectionInputSchema = z.object({
  name: nameSchema,
  /** Empty for none. */
  description: descriptionSchema.optional(),
  icon: iconSchema.optional(),
  /** Made from the name when left out. */
  slug: collectionSlugSchema.optional(),
});
export type CollectionInput = z.input<typeof collectionInputSchema>;

export const collectionChangesSchema = collectionInputSchema.partial();
export type CollectionChanges = z.input<typeof collectionChangesSchema>;

export type CreateCollectionResult =
  { ok: true; collection: Collection } | { ok: false; reason: "forbidden" | "slug_taken" };
export type ChangeCollectionResult =
  | { ok: true; collection: Collection }
  /** `slug_locked`: it has published articles, whose addresses its slug is part of. */
  | { ok: false; reason: "not_found" | "slug_taken" | "slug_locked" };
export type RemoveCollectionResult =
  /** `not_empty`: it still holds articles. Move or remove them first, or release them. */
  { ok: true } | { ok: false; reason: "not_found" | "not_empty" };

const COLUMNS = "id, name, slug, description, icon, position, updated_at, articles(count)";

/** Postgres's codes for what the database refuses. `HW409` is our own, for a locked slug. */
const NOT_ALLOWED = "42501";
const TAKEN = "23505";
const STILL_USED = "23503";
const LOCKED = "HW409";

export interface ListCollectionsOptions {
  /**
   * Only collections with an article for everyone, or for this audience, counting only those.
   */
  audience?: string | undefined;
}

export function createCollections(supabase: HelpwrenSupabaseClient) {
  return {
    /**
     * The collections, in their order. A visitor gets the ones with a published article; the
     * team gets them all.
     */
    async list(options: ListCollectionsOptions = {}): Promise<Collection[]> {
      let query = supabase.from("collections").select(COLUMNS);
      if (options.audience) {
        query = query.or(forAudience(options.audience), { referencedTable: "articles" });
      }
      const { data, error } = await query.order("position").order("name");
      if (error) throw new HelpwrenError("Could not load the collections.", { cause: error });
      const collections = z.array(collectionSchema).parse(data);
      return options.audience
        ? collections.filter((collection) => collection.articleCount > 0)
        : collections;
    },

    /** One collection by its slug, or `null` if there is none the caller can read. */
    async getBySlug(slug: string): Promise<Collection | null> {
      const parsed = collectionSlugSchema.safeParse(slug);
      if (!parsed.success) return null;
      const { data, error } = await supabase
        .from("collections")
        .select(COLUMNS)
        .eq("slug", parsed.data)
        .maybeSingle();
      if (error) throw new HelpwrenError("Could not load the collection.", { cause: error });
      return data ? collectionSchema.parse(data) : null;
    },

    /** Makes a collection, at the end of the list. For the team. */
    async create(input: CollectionInput): Promise<CreateCollectionResult> {
      const { slug, description, name, icon } = collectionInputSchema.parse(input);
      const row = {
        name,
        description: description === undefined || description === "" ? null : description,
        ...(icon === undefined ? {} : { icon }),
      };
      const insert = (candidate: string) =>
        supabase
          .from("collections")
          .insert({ ...row, slug: candidate })
          .select(COLUMNS)
          .single();
      // A slug the caller chose is theirs to fix if taken; one made from the name finds a gap.
      const { data, error } = slug
        ? await insert(slug)
        : await insertWithFreeSlug(slugify(name) || "collection", insert);
      if (error) {
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
        if (error.code === TAKEN) return { ok: false, reason: "slug_taken" };
        throw new HelpwrenError("Could not make the collection.", { cause: error });
      }
      return { ok: true, collection: collectionSchema.parse(data) };
    },

    /** Changes the parts given and leaves the rest. For the team. */
    async update(id: string, changes: CollectionChanges): Promise<ChangeCollectionResult> {
      const parsed = collectionChangesSchema.parse(changes);
      const values: Database["public"]["Tables"]["collections"]["Update"] = {};
      if (parsed.name !== undefined) values.name = parsed.name;
      if (parsed.description !== undefined) {
        values.description = parsed.description ? parsed.description : null;
      }
      if (parsed.icon !== undefined) values.icon = parsed.icon;
      if (parsed.slug !== undefined) values.slug = parsed.slug;
      const { data, error } = await supabase
        .from("collections")
        .update(values)
        .eq("id", id)
        .select(COLUMNS);
      if (error) {
        if (error.code === TAKEN) return { ok: false, reason: "slug_taken" };
        if (error.code === LOCKED) return { ok: false, reason: "slug_locked" };
        throw new HelpwrenError("Could not change the collection.", { cause: error });
      }
      // The access rules hide the row from anyone who may not change it, so nothing comes back.
      const [row] = data;
      return row
        ? { ok: true, collection: collectionSchema.parse(row) }
        : { ok: false, reason: "not_found" };
    },

    /** Puts the collections in the order of the ids given. For the team. */
    async reorder(ids: readonly string[]): Promise<void> {
      const { error } = await supabase.rpc("reorder_collections", {
        ids: z.array(z.uuid()).parse(ids),
      });
      if (error) throw new HelpwrenError("Could not reorder the collections.", { cause: error });
    },

    /**
     * Removes a collection. One that holds articles is refused (`not_empty`) unless
     * `releaseArticles` is set: its articles are then kept, as drafts in no collection, since a
     * published article has to be in one. For the team.
     */
    async remove(
      id: string,
      options: { releaseArticles?: boolean } = {},
    ): Promise<RemoveCollectionResult> {
      if (options.releaseArticles === true) {
        const { error } = await supabase
          .from("articles")
          .update({ status: "draft", collection_id: null })
          .eq("collection_id", z.uuid().parse(id));
        if (error) throw new HelpwrenError("Could not remove the collection.", { cause: error });
      }
      const { data, error } = await supabase.from("collections").delete().eq("id", id).select("id");
      if (error) {
        if (error.code === STILL_USED) return { ok: false, reason: "not_empty" };
        throw new HelpwrenError("Could not remove the collection.", { cause: error });
      }
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },
  };
}

export type CollectionsApi = ReturnType<typeof createCollections>;

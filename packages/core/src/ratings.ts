import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

export const RATING_MAX = 5;

export const ratingScoreSchema = z.number().int().min(1).max(RATING_MAX);
export const ratingCommentSchema = z.string().trim().max(1000);

const ratingRowSchema = z.object({
  conversation_id: z.uuid(),
  score: ratingScoreSchema,
  comment: z.string().nullable(),
  created_at: z.string(),
});

export const ratingSchema = ratingRowSchema.transform((row) => ({
  conversationId: row.conversation_id,
  /** From 1, the worst, to 5, the best. */
  score: row.score,
  comment: row.comment,
  createdAt: row.created_at,
}));

/** How a contact said a resolved conversation went. */
export type Rating = z.infer<typeof ratingSchema>;

export type SubmitRatingResult =
  { ok: true; rating: Rating } | { ok: false; reason: "not_resolved" | "already_rated" };

const COLUMNS = "conversation_id, score, comment, created_at";

/** Postgres's codes for a row the access rules do not allow, and for a second rating. */
const NOT_ALLOWED = "42501";
const ALREADY_EXISTS = "23505";

export function createRatings(supabase: HelpwrenSupabaseClient) {
  return {
    /** A conversation's rating, or `null` if it has not been rated. */
    async get(conversationId: string): Promise<Rating | null> {
      const { data, error } = await supabase
        .from("conversation_ratings")
        .select(COLUMNS)
        .eq("conversation_id", conversationId)
        .maybeSingle();
      if (error) throw new HelpwrenError("Could not load the rating.", { cause: error });
      return data ? ratingSchema.parse(data) : null;
    },

    /**
     * Rates a conversation as its contact. It must be resolved or closed, and can be rated only
     * once.
     */
    async submit(
      conversationId: string,
      score: number,
      comment?: string,
    ): Promise<SubmitRatingResult> {
      const { data: claims } = await supabase.auth.getClaims();
      if (!claims) throw new HelpwrenError("Start a session before rating a conversation.");
      const text = ratingCommentSchema.parse(comment ?? "");

      const { data, error } = await supabase
        .from("conversation_ratings")
        .insert({
          conversation_id: conversationId,
          contact_id: claims.claims.sub,
          score: ratingScoreSchema.parse(score),
          comment: text === "" ? null : text,
        })
        .select(COLUMNS)
        .single();

      if (error) {
        if (error.code === ALREADY_EXISTS) return { ok: false, reason: "already_rated" };
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "not_resolved" };
        throw new HelpwrenError("Could not save the rating.", { cause: error });
      }
      return { ok: true, rating: ratingSchema.parse(data) };
    },
  };
}

export type RatingsApi = ReturnType<typeof createRatings>;

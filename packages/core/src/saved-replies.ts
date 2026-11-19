import { z } from "zod";

import { MESSAGE_MAX_LENGTH } from "./conversations";
import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

export const SAVED_REPLY_TITLE_MAX_LENGTH = 80;
export const SAVED_REPLY_SHORTCUT_MAX_LENGTH = 40;

/** Who sees a saved reply: the whole team, or only the person it belongs to. */
export const savedReplyVisibilitySchema = z.enum(["team", "personal"]);
export type SavedReplyVisibility = z.infer<typeof savedReplyVisibilitySchema>;

/** Typed after `/` in the reply box: lowercase words joined by hyphens, such as `refund`. */
export const savedReplyShortcutSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and hyphens.")
  .max(SAVED_REPLY_SHORTCUT_MAX_LENGTH);

export const savedReplySchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    body: z.string(),
    shortcut: z.string().nullable(),
    visibility: savedReplyVisibilitySchema,
    owner_id: z.uuid().nullable(),
    created_by: z.uuid().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    title: row.title,
    /** Plain text, with placeholders such as `{contact.first_name}` left in. */
    body: row.body,
    shortcut: row.shortcut,
    visibility: row.visibility,
    /** Who a personal reply belongs to; `null` for a team reply. */
    ownerId: row.owner_id,
    /** Who wrote it, or `null` if they have since been removed from the team. */
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

/** Text a team member puts into the reply box in one go. */
export type SavedReply = z.infer<typeof savedReplySchema>;

/** What a saved reply is made from, by the editor and by "Save as reply" alike. */
export const savedReplyInputSchema = z.object({
  title: z.string().trim().min(1, "Give it a title.").max(SAVED_REPLY_TITLE_MAX_LENGTH),
  body: z.string().trim().min(1, "Write the reply.").max(MESSAGE_MAX_LENGTH),
  // Left empty, a reply has no shortcut and is found by its title.
  shortcut: z
    .union([z.literal("").transform(() => null), savedReplyShortcutSchema])
    .nullable()
    .default(null),
  visibility: savedReplyVisibilitySchema.default("team"),
});

export type SavedReplyInput = z.input<typeof savedReplyInputSchema>;

export type SavedReplyFailure = "forbidden" | "shortcut_taken" | "not_found";
export type CreateSavedReplyResult =
  { ok: true; reply: SavedReply } | { ok: false; reason: Exclude<SavedReplyFailure, "not_found"> };
export type ChangeSavedReplyResult =
  { ok: true; reply: SavedReply } | { ok: false; reason: SavedReplyFailure };
export type RemoveSavedReplyResult = { ok: true } | { ok: false; reason: "not_found" };

export interface ListSavedRepliesOptions {
  /** Matches the title or the shortcut. */
  search?: string | undefined;
}

const COLUMNS =
  "id, title, body, shortcut, visibility, owner_id, created_by, created_at, updated_at";

/** Characters that have a meaning in a filter and so cannot be searched for as themselves. */
const FILTER_SYNTAX = /[,()%*\\"]/g;

/** Postgres's codes for an action the access rules refuse, and for a value already in use. */
const NOT_ALLOWED = "42501";
const TAKEN = "23505";

function refusal(code: string | undefined): "forbidden" | "shortcut_taken" | undefined {
  if (code === NOT_ALLOWED) return "forbidden";
  if (code === TAKEN) return "shortcut_taken";
  return undefined;
}

export function createSavedReplies(supabase: HelpwrenSupabaseClient) {
  /** The signed-in team member's id: a personal reply is theirs. */
  async function myId() {
    const { data } = await supabase.auth.getClaims();
    if (!data) throw new HelpwrenError("Sign in before saving a reply.");
    return data.claims.sub;
  }

  /** The columns an input sets, with the owner a personal reply needs. */
  async function columns(input: SavedReplyInput) {
    const { title, body, shortcut, visibility } = savedReplyInputSchema.parse(input);
    return {
      title,
      body,
      shortcut,
      visibility,
      owner_id: visibility === "personal" ? await myId() : null,
    };
  }

  return {
    /** The team's replies and the signed-in team member's own, by title. */
    async list(options: ListSavedRepliesOptions = {}): Promise<SavedReply[]> {
      let query = supabase.from("saved_replies").select(COLUMNS).order("title");
      const term = options.search?.replace(FILTER_SYNTAX, " ").trim();
      if (term) query = query.or(`title.ilike.%${term}%,shortcut.ilike.%${term}%`);
      const { data, error } = await query;
      if (error) throw new HelpwrenError("Could not load the saved replies.", { cause: error });
      return z.array(savedReplySchema).parse(data);
    },

    /** Saves a new reply, written by the signed-in team member. */
    async create(input: SavedReplyInput): Promise<CreateSavedReplyResult> {
      const { data, error } = await supabase
        .from("saved_replies")
        .insert({ ...(await columns(input)), created_by: await myId() })
        .select(COLUMNS)
        .single();
      if (error) {
        const reason = refusal(error.code);
        if (reason) return { ok: false, reason };
        throw new HelpwrenError("Could not save the reply.", { cause: error });
      }
      return { ok: true, reply: savedReplySchema.parse(data) };
    },

    /**
     * Changes a reply. A personal one only its owner may change; a team one its author or an
     * admin. Anyone else finds nothing to change.
     */
    async update(id: string, input: SavedReplyInput): Promise<ChangeSavedReplyResult> {
      const { data, error } = await supabase
        .from("saved_replies")
        .update(await columns(input))
        .eq("id", id)
        .select(COLUMNS);
      if (error) {
        const reason = refusal(error.code);
        if (reason) return { ok: false, reason };
        throw new HelpwrenError("Could not change the reply.", { cause: error });
      }
      const [row] = data;
      return row
        ? { ok: true, reply: savedReplySchema.parse(row) }
        : { ok: false, reason: "not_found" };
    },

    async remove(id: string): Promise<RemoveSavedReplyResult> {
      const { data, error } = await supabase
        .from("saved_replies")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw new HelpwrenError("Could not delete the reply.", { cause: error });
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },
  };
}

export type SavedRepliesApi = ReturnType<typeof createSavedReplies>;

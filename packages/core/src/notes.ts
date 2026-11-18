import { z } from "zod";

import { MESSAGE_MAX_LENGTH } from "./conversations";
import { HelpwrenError } from "./errors";
import { listenForRows, type Unsubscribe } from "./realtime";
import { type HelpwrenSupabaseClient } from "./supabase";

const noteRowSchema = z.object({
  id: z.uuid(),
  conversation_id: z.uuid(),
  author_id: z.uuid(),
  body: z.string(),
  created_at: z.string(),
});

export const noteSchema = noteRowSchema.transform((row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  /** The team member who wrote it. */
  authorId: row.author_id,
  body: row.body,
  createdAt: row.created_at,
}));

/** Something the team wrote to itself on a conversation. Its contact never sees it. */
export type Note = z.infer<typeof noteSchema>;

export const noteBodySchema = z.string().trim().min(1).max(MESSAGE_MAX_LENGTH);

const COLUMNS = "id, conversation_id, author_id, body, created_at";

export function createNotes(supabase: HelpwrenSupabaseClient) {
  return {
    /** A conversation's internal notes, oldest first. Only the team gets any. */
    async list(conversationId: string): Promise<Note[]> {
      const { data, error } = await supabase
        .from("notes")
        .select(COLUMNS)
        .eq("conversation_id", conversationId)
        .order("created_at");
      if (error) throw new HelpwrenError("Could not load the notes.", { cause: error });
      return z.array(noteSchema).parse(data);
    },

    /** Adds a note as the signed-in team member. */
    async add(conversationId: string, body: string): Promise<Note> {
      const { data: claims } = await supabase.auth.getClaims();
      if (!claims) throw new HelpwrenError("Sign in before adding a note.");

      const { data, error } = await supabase
        .from("notes")
        .insert({
          conversation_id: conversationId,
          author_id: claims.claims.sub,
          body: noteBodySchema.parse(body),
        })
        .select(COLUMNS)
        .single();
      if (error) throw new HelpwrenError("Could not add the note.", { cause: error });
      return noteSchema.parse(data);
    },

    /**
     * Calls back for each new note on a conversation. Resolves once listening has started, and
     * rejects for anyone who is not on the team.
     */
    subscribe(conversationId: string, onNote: (note: Note) => void): Promise<Unsubscribe> {
      return listenForRows(supabase, `notes:${conversationId}`, ["INSERT"], noteSchema, onNote);
    },
  };
}

export type NotesApi = ReturnType<typeof createNotes>;

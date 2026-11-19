import { z } from "zod";

import { RATE_LIMITED_SQLSTATE } from "./api";
import { attachmentSchema, ATTACHMENTS_MAX, type Attachment } from "./attachments";
import { messageBodySchema, type Page } from "./conversations";
import { HelpwrenError } from "./errors";
import { listenForRows, type Unsubscribe } from "./realtime";
import { type HelpwrenSupabaseClient } from "./supabase";

const messageRowSchema = z.object({
  id: z.uuid(),
  conversation_id: z.uuid(),
  sender_id: z.uuid(),
  sender_role: z.enum(["guest", "user", "agent", "system"]),
  body: z.string().nullable(),
  attachments: z.array(attachmentSchema).default([]),
  created_at: z.string(),
});

export const messageSchema = messageRowSchema.transform((row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  senderRole: row.sender_role,
  body: row.body ?? "",
  attachments: row.attachments,
  createdAt: row.created_at,
}));

export type Message = z.infer<typeof messageSchema>;

const MESSAGE_COLUMNS =
  "id, conversation_id, sender_id, sender_role, body, attachments, created_at";

export interface ListMessagesOptions {
  /** `nextCursor` from the previous page, to load older messages. */
  cursor?: string | undefined;
  /** How many to return. Default 50. */
  limit?: number | undefined;
}

export type SendMessageResult =
  | { ok: true; message: Message }
  // Too fast; refused as spam or as the same words again; or the sender has been blocked.
  | { ok: false; reason: "rate_limited" | "refused" | "blocked" };

/** The database's codes for a message it refuses as spam, and for a blocked sender. */
const REFUSED_SQLSTATE = "HW422";
const BLOCKED_SQLSTATE = "HW403";

export function createMessages(supabase: HelpwrenSupabaseClient) {
  return {
    /**
     * A page of a conversation's messages in the order they were sent, starting from the most
     * recent page. `nextCursor` loads the page before it.
     */
    async list(conversationId: string, options: ListMessagesOptions = {}): Promise<Page<Message>> {
      const limit = options.limit ?? 50;
      let query = supabase
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (options.cursor) query = query.lt("created_at", options.cursor);

      const { data, error } = await query;
      if (error) throw new HelpwrenError("Could not load the messages.", { cause: error });

      const newestFirst = z.array(messageSchema).parse(data.slice(0, limit));
      // One extra row was asked for, only to learn whether older messages exist.
      const oldest = data.length > limit ? newestFirst.at(-1) : undefined;
      return { items: newestFirst.reverse(), nextCursor: oldest?.createdAt };
    },

    /**
     * Sends a message as whoever is signed in: words, files already uploaded with
     * `attachments.upload`, or both.
     */
    async send(
      conversationId: string,
      body: string,
      attachments: readonly Attachment[] = [],
    ): Promise<SendMessageResult> {
      const files = z.array(attachmentSchema).max(ATTACHMENTS_MAX).parse(attachments);
      // With a file, the words are optional.
      const text = files.length > 0 && body.trim() === "" ? null : messageBodySchema.parse(body);

      const { data: claims } = await supabase.auth.getClaims();
      if (!claims) throw new HelpwrenError("Sign in before sending a message.");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: claims.claims.sub,
          // The column is required, but the database replaces this with the sender's real role.
          sender_role: "guest",
          body: text,
          attachments: files,
        })
        .select(MESSAGE_COLUMNS)
        .single();

      if (error) {
        if (error.code === RATE_LIMITED_SQLSTATE) return { ok: false, reason: "rate_limited" };
        if (error.code === REFUSED_SQLSTATE) return { ok: false, reason: "refused" };
        if (error.code === BLOCKED_SQLSTATE) return { ok: false, reason: "blocked" };
        throw new HelpwrenError("Could not send the message.", { cause: error });
      }
      return { ok: true, message: messageSchema.parse(data) };
    },

    /**
     * Calls back for each new message in a conversation, including the caller's own. Resolves
     * once listening has started, and rejects if the caller may not read the conversation.
     */
    subscribe(conversationId: string, onMessage: (message: Message) => void): Promise<Unsubscribe> {
      return listenForRows(
        supabase,
        `conversation:${conversationId}`,
        ["INSERT"],
        messageSchema,
        onMessage,
      );
    },
  };
}

export type MessagesApi = ReturnType<typeof createMessages>;

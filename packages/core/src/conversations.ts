import { z } from "zod";

import { type Api } from "./api";
import { HelpwrenError } from "./errors";
import { listenForRows, type Unsubscribe } from "./realtime";
import { type GuestDetails } from "./settings";
import { type HelpwrenSupabaseClient } from "./supabase";

export const MESSAGE_MAX_LENGTH = 5000;

export const messageBodySchema = z.string().trim().min(1).max(MESSAGE_MAX_LENGTH);

/** A phone number in international format: a plus sign, the country code, then the number. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/);

export const contactDetailsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
  phone: phoneSchema.optional(),
});

export type ContactDetails = z.infer<typeof contactDetailsSchema>;

/** What `POST /api/conversations` accepts. */
export const startConversationInputSchema = z.object({
  message: messageBodySchema,
  source: z.string().trim().min(1).max(40).default("web"),
  /** Who is writing. Needed the first time, according to the install's guest details setting. */
  contact: contactDetailsSchema.default({}),
  /** The page the chat was opened from, shown to agents as context. */
  page: z
    .object({ url: z.url().max(2000), title: z.string().trim().max(300).optional() })
    .optional(),
});

export type StartConversationInput = z.input<typeof startConversationInputSchema>;

export const startConversationResultSchema = z.object({ conversationId: z.uuid() });

/** Whether these details are enough to start chatting under the install's setting. */
export function hasRequiredGuestDetails(
  required: GuestDetails,
  details: Partial<Record<keyof ContactDetails, string | null | undefined>>,
): boolean {
  if (required === "none") return true;
  if (!details.name) return false;
  if (required === "email") return Boolean(details.email);
  if (required === "phone") return Boolean(details.phone);
  return Boolean(details.email) || Boolean(details.phone);
}

export const conversationStatusSchema = z.enum(["open", "pending", "resolved", "closed"]);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

/** A conversation as the database stores it. Also the shape of a live update. */
const conversationRowSchema = z.object({
  id: z.uuid(),
  contact_id: z.uuid(),
  status: conversationStatusSchema,
  source: z.string(),
  context: z.record(z.string(), z.unknown()),
  assignee_id: z.uuid().nullable(),
  last_message_preview: z.string().nullable(),
  last_message_at: z.string().nullable(),
  unread_for_contact: z.number().int(),
  unread_for_agents: z.number().int(),
  created_at: z.string(),
});

export const conversationSchema = conversationRowSchema.transform((row) => ({
  id: row.id,
  contactId: row.contact_id,
  status: row.status,
  source: row.source,
  /** Where the chat was opened from: page URL, title, browser. */
  context: row.context,
  assigneeId: row.assignee_id,
  lastMessagePreview: row.last_message_preview,
  lastMessageAt: row.last_message_at,
  unreadForContact: row.unread_for_contact,
  unreadForAgents: row.unread_for_agents,
  createdAt: row.created_at,
}));

export type Conversation = z.infer<typeof conversationSchema>;

const contactRowSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["guest", "user"]),
  verified: z.boolean(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export type Contact = z.infer<typeof contactRowSchema>;

const conversationWithContactSchema = conversationRowSchema
  .extend({ contact: contactRowSchema })
  .transform(({ contact, ...row }) => ({ ...conversationSchema.parse(row), contact }));

/** A conversation together with the person it is with. */
export type ConversationWithContact = z.infer<typeof conversationWithContactSchema>;

const CONVERSATION_COLUMNS =
  "id, contact_id, status, source, context, assignee_id, last_message_preview, last_message_at, " +
  "unread_for_contact, unread_for_agents, created_at";
const WITH_CONTACT = `${CONVERSATION_COLUMNS}, contact:contacts!inner(id, kind, verified, name, email, phone)`;

export interface Page<Item> {
  items: Item[];
  /** Pass to the next call to continue. `undefined` on the last page. */
  nextCursor: string | undefined;
}

export interface ListConversationsOptions {
  /** `nextCursor` from the previous page. */
  cursor?: string | undefined;
  /** How many to return. Default 25. */
  limit?: number | undefined;
  /** Only conversations in one of these statuses. Default: any status. */
  status?: readonly ConversationStatus[] | undefined;
}

export type StartConversationResult =
  | { ok: true; conversation: ConversationWithContact }
  | { ok: false; reason: "details_required" | "rate_limited" };

/** Whose unread messages to count: the signed-in contact's, or the team's. */
export type UnreadSide = "contact" | "agents";

function unexpected(what: string, cause: unknown): HelpwrenError {
  return new HelpwrenError(`Could not ${what}.`, { cause });
}

export function createConversations(supabase: HelpwrenSupabaseClient, api: Api) {
  async function get(id: string): Promise<ConversationWithContact | null> {
    const { data, error } = await supabase
      .from("conversations")
      .select(WITH_CONTACT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw unexpected("load the conversation", error);
    return data ? conversationWithContactSchema.parse(data) : null;
  }

  return {
    /** One conversation, or `null` if it does not exist or is not the caller's to read. */
    get,

    /**
     * The conversations the caller may read, most recently active first: their own for a
     * contact, everyone's for a team member.
     */
    async list(options: ListConversationsOptions = {}): Promise<Page<ConversationWithContact>> {
      const limit = options.limit ?? 25;
      let query = supabase
        .from("conversations")
        .select(WITH_CONTACT)
        .order("last_message_at", { ascending: false })
        .limit(limit + 1);
      if (options.cursor) query = query.lt("last_message_at", options.cursor);
      if (options.status) query = query.in("status", options.status);

      const { data, error } = await query;
      if (error) throw unexpected("load the conversations", error);

      const items = z.array(conversationWithContactSchema).parse(data.slice(0, limit));
      // One extra row was asked for, only to learn whether another page exists.
      const last = data.length > limit ? items.at(-1) : undefined;
      return { items, nextCursor: last?.lastMessageAt ?? undefined };
    },

    /**
     * Starts a conversation with its first message. Contact details are needed the first time,
     * according to the install's guest details setting.
     */
    async start(input: StartConversationInput): Promise<StartConversationResult> {
      const result = await api.post(
        "/api/conversations",
        startConversationInputSchema.parse(input),
        startConversationResultSchema,
      );

      if (!result.ok) {
        if (result.code === "details_required" || result.code === "rate_limited") {
          return { ok: false, reason: result.code };
        }
        throw unexpected("start the conversation", result);
      }

      const conversation = await get(result.data.conversationId);
      if (!conversation) throw unexpected("load the new conversation", result);
      return { ok: true, conversation };
    },

    /** How many conversations the caller may read are in each status. */
    async countByStatus(): Promise<Record<ConversationStatus, number>> {
      const counts = await Promise.all(
        conversationStatusSchema.options.map(async (status) => {
          const { count, error } = await supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          if (error) throw unexpected("count the conversations", error);
          return [status, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(counts) as Record<ConversationStatus, number>;
    },

    /** Clears the unread count for the caller's side of a conversation. */
    async markRead(id: string): Promise<void> {
      const result = await api.post(`/api/conversations/${id}/read`, undefined, z.undefined());
      if (!result.ok) throw unexpected("mark the conversation as read", result);
    },

    /** How many unread messages the caller's side has, across conversations. */
    async unreadCount(side: UnreadSide): Promise<number> {
      const column = side === "agents" ? "unread_for_agents" : "unread_for_contact";
      let query = supabase.from("conversations").select(column).gt(column, 0);
      if (side === "contact") {
        const { data: claims } = await supabase.auth.getClaims();
        if (!claims) return 0;
        // Shared conversations are readable too, but only the contact's own count for them.
        query = query.eq("contact_id", claims.claims.sub);
      }

      const { data, error } = await query;
      if (error) throw unexpected("count unread messages", error);
      return data.reduce((total, row) => total + Number(Object.values(row)[0]), 0);
    },

    /**
     * Calls back whenever a conversation is created or changes: every conversation for a team
     * member (`{ inbox: true }`), or one contact's own. Resolves once listening has started.
     * The update carries the conversation without its contact.
     */
    subscribe(
      scope: { inbox: true } | { contactId: string },
      onChange: (conversation: Conversation) => void,
    ): Promise<Unsubscribe> {
      const topic = "inbox" in scope ? "inbox" : `contact:${scope.contactId}`;
      return listenForRows(supabase, topic, ["INSERT", "UPDATE"], conversationSchema, onChange);
    },
  };
}

export type ConversationsApi = ReturnType<typeof createConversations>;

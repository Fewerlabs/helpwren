import { z } from "zod";

import { type Api } from "./api";
import { type Database } from "./database.types";
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

export const conversationPrioritySchema = z.enum(["low", "normal", "high"]);
export type ConversationPriority = z.infer<typeof conversationPrioritySchema>;

/** A ticket is a conversation that is being tracked: it has a number, and usually a subject. */
export const conversationTypeSchema = z.enum(["chat", "ticket"]);
export type ConversationType = z.infer<typeof conversationTypeSchema>;

export const ticketSubjectSchema = z.string().trim().min(1).max(200);

/** A conversation as the database stores it. Also the shape of a live update. */
const conversationRowSchema = z.object({
  id: z.uuid(),
  contact_id: z.uuid(),
  status: conversationStatusSchema,
  type: conversationTypeSchema,
  ticket_number: z.number().int().nullable(),
  subject: z.string().nullable(),
  priority: conversationPrioritySchema,
  source: z.string(),
  context: z.record(z.string(), z.unknown()),
  assignee_id: z.uuid().nullable(),
  // Missing from rows written before teams existed in a client's cache or a live message.
  team_id: z.uuid().nullish(),
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
  type: row.type,
  /** Set once a conversation becomes a ticket. People quote it, so it never changes. */
  ticketNumber: row.ticket_number,
  subject: row.subject,
  priority: row.priority,
  source: row.source,
  /** Where the chat was opened from: page URL, title, browser. */
  context: row.context,
  assigneeId: row.assignee_id,
  /** The team it has been given to, if any. */
  teamId: row.team_id ?? null,
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
  "id, contact_id, status, type, ticket_number, subject, priority, source, context, assignee_id, " +
  "team_id, " +
  "last_message_preview, last_message_at, " +
  "unread_for_contact, unread_for_agents, created_at";
const WITH_CONTACT = `${CONVERSATION_COLUMNS}, contact:contacts!inner(id, kind, verified, name, email, phone)`;

export interface Page<Item> {
  items: Item[];
  /** Pass to the next call to continue. `undefined` on the last page. */
  nextCursor: string | undefined;
}

/** Which conversations to list or count. Everything given must match. */
export interface ConversationFilter {
  /** Only conversations in one of these statuses. Default: any status. */
  status?: readonly ConversationStatus[] | undefined;
  /** Only tickets, or only chats. */
  type?: ConversationType | undefined;
  /** Only those assigned to this team member, or `null` for those assigned to nobody. */
  assigneeId?: string | null | undefined;
  /** Only those assigned to one of these team members. `null` in the list means nobody. */
  assignees?: readonly (string | null)[] | undefined;
  /** Only those given to one of these teams. `null` in the list means no team. */
  teams?: readonly (string | null)[] | undefined;
  /** Only conversations with one of these priorities. */
  priority?: readonly ConversationPriority[] | undefined;
  /** Only one contact's conversations. */
  contactId?: string | undefined;
}

export interface ListConversationsOptions extends ConversationFilter {
  /** `nextCursor` from the previous page. */
  cursor?: string | undefined;
  /** How many to return. Default 25. */
  limit?: number | undefined;
}

/** What a team member may change about a conversation. */
export const conversationChangesSchema = z
  .object({
    status: conversationStatusSchema,
    priority: conversationPrioritySchema,
    /** A team member's id, or `null` to leave it with nobody. */
    assigneeId: z.uuid().nullable(),
    /** A team's id, or `null` to leave it with no team. */
    teamId: z.uuid().nullable(),
    subject: ticketSubjectSchema,
  })
  .partial();

export type ConversationChanges = z.input<typeof conversationChangesSchema>;

export type ChangeConversationResult =
  { ok: true; conversation: ConversationWithContact } | { ok: false; reason: "not_found" };

export type StartConversationResult =
  | { ok: true; conversation: ConversationWithContact }
  | { ok: false; reason: "details_required" | "rate_limited" };

/** Whose unread messages to count: the signed-in contact's, or the team's. */
export type UnreadSide = "contact" | "agents";

/** The parts of a query builder that filtering uses. Each returns the builder, to chain. */
interface Filterable<Query> {
  in: (column: string, values: readonly string[]) => Query;
  eq: (column: string, value: string) => Query;
  is: (column: string, value: null) => Query;
  or: (filters: string) => Query;
}

/** Narrows a query of conversations to those that match every part of a filter. */
function applyFilter<Query extends Filterable<Query>>(
  query: Query,
  filter: ConversationFilter,
): Query {
  let narrowed = query;
  if (filter.status) narrowed = narrowed.in("status", filter.status);
  if (filter.priority) narrowed = narrowed.in("priority", filter.priority);
  if (filter.type) narrowed = narrowed.eq("type", filter.type);
  if (filter.contactId) narrowed = narrowed.eq("contact_id", filter.contactId);
  if (filter.assigneeId === null) narrowed = narrowed.is("assignee_id", null);
  else if (filter.assigneeId) narrowed = narrowed.eq("assignee_id", filter.assigneeId);

  narrowed = oneOf(narrowed, "assignee_id", filter.assignees);
  narrowed = oneOf(narrowed, "team_id", filter.teams);
  return narrowed;
}

/** Narrows to rows whose column is one of these ids, where `null` in the list means unset. */
function oneOf<Query extends Filterable<Query>>(
  query: Query,
  column: string,
  wanted: readonly (string | null)[] | undefined,
): Query {
  if (!wanted) return query;
  // Checked as ids before they are written into a filter expression.
  const ids = z.array(z.uuid()).parse(wanted.filter((id) => id !== null));
  const unset = wanted.includes(null);
  if (ids.length > 0 && unset) return query.or(`${column}.in.(${ids.join(",")}),${column}.is.null`);
  if (ids.length > 0) return query.in(column, ids);
  if (unset) return query.is(column, null);
  return query;
}

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

  async function change(
    id: string,
    values: Database["public"]["Tables"]["conversations"]["Update"],
  ): Promise<ChangeConversationResult> {
    const { data, error } = await supabase
      .from("conversations")
      .update(values)
      .eq("id", id)
      .select(WITH_CONTACT)
      .maybeSingle();
    if (error) throw unexpected("change the conversation", error);
    // The access rules hide what the caller may not change, so "not allowed" looks like this too.
    if (!data) return { ok: false, reason: "not_found" };
    return { ok: true, conversation: conversationWithContactSchema.parse(data) };
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
      query = applyFilter(query, options);

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

    /**
     * Finds conversations by who they are with, by what was said in them, or by a ticket's
     * number or subject, most recently active first, optionally within a filter. Searching by
     * text starts at two characters; less than that finds nothing.
     */
    async search(
      text: string,
      filter: ConversationFilter = {},
    ): Promise<ConversationWithContact[]> {
      const { data, error } = await applyFilter(
        supabase.rpc("search_conversations", { query: text }).select(WITH_CONTACT),
        filter,
      );
      if (error) throw unexpected("search the conversations", error);
      return z.array(conversationWithContactSchema).parse(data);
    },

    /** How many conversations the caller may read match a filter. */
    async count(filter: ConversationFilter = {}): Promise<number> {
      let query = supabase.from("conversations").select("id", { count: "exact", head: true });
      query = applyFilter(query, filter);

      const { count, error } = await query;
      if (error) throw unexpected("count the conversations", error);
      return count ?? 0;
    },

    /**
     * Changes a conversation's status, priority, assignee or subject. For team members: for
     * anyone else, and for a conversation that does not exist, nothing is found to change.
     */
    async update(id: string, changes: ConversationChanges): Promise<ChangeConversationResult> {
      const { status, priority, assigneeId, teamId, subject } =
        conversationChangesSchema.parse(changes);
      return change(id, {
        ...(status === undefined ? {} : { status }),
        ...(priority === undefined ? {} : { priority }),
        ...(assigneeId === undefined ? {} : { assignee_id: assigneeId }),
        ...(teamId === undefined ? {} : { team_id: teamId }),
        ...(subject === undefined ? {} : { subject }),
      });
    },

    /**
     * Turns a conversation into a ticket, which gives it a number. It stays the same thread,
     * and it cannot be turned back.
     */
    async convertToTicket(id: string, subject: string): Promise<ChangeConversationResult> {
      return change(id, { type: "ticket", subject: ticketSubjectSchema.parse(subject) });
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

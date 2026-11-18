import { z } from "zod";

import { conversationPrioritySchema, conversationStatusSchema } from "./conversations";
import { HelpwrenError } from "./errors";
import { listenForRows, type Unsubscribe } from "./realtime";
import { type HelpwrenSupabaseClient } from "./supabase";

const base = {
  id: z.uuid(),
  conversation_id: z.uuid(),
  actor_id: z.uuid().nullable(),
  created_at: z.string(),
};

const eventRowSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("ticket_created"),
    data: z.object({ number: z.number().int(), subject: z.string().nullable() }),
  }),
  z.object({
    ...base,
    kind: z.literal("status_changed"),
    data: z.object({ from: conversationStatusSchema, to: conversationStatusSchema }),
  }),
  z.object({
    ...base,
    kind: z.literal("assigned"),
    data: z.object({ to: z.uuid().nullable() }),
  }),
  z.object({
    ...base,
    kind: z.literal("priority_changed"),
    data: z.object({ from: conversationPrioritySchema, to: conversationPrioritySchema }),
  }),
  z.object({
    ...base,
    kind: z.literal("team_changed"),
    // The name is kept with the event, so it still reads right after a team is renamed.
    data: z.object({ to: z.uuid().nullable(), name: z.string().nullable() }),
  }),
  z.object({
    ...base,
    kind: z.literal("rated"),
    data: z.object({ score: z.number().int() }),
  }),
]);

export const conversationEventSchema = eventRowSchema.transform((row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  /** Who made the change: a team member or the contact. `null` when the system did. */
  actorId: row.actor_id,
  createdAt: row.created_at,
  // `kind` says which shape `data` has: {number, subject}, {from, to}, {to} or {score}.
  ...(row.kind === "ticket_created"
    ? { kind: row.kind, data: row.data }
    : row.kind === "status_changed"
      ? { kind: row.kind, data: row.data }
      : row.kind === "assigned"
        ? { kind: row.kind, data: row.data }
        : row.kind === "priority_changed"
          ? { kind: row.kind, data: row.data }
          : row.kind === "team_changed"
            ? { kind: row.kind, data: row.data }
            : { kind: row.kind, data: row.data }),
}));

/**
 * Something that happened to a conversation besides a message: it became a ticket, its status
 * changed, it was assigned, its priority changed, or its contact rated it. The database
 * records these itself.
 */
export type ConversationEvent = z.infer<typeof conversationEventSchema>;

const COLUMNS = "id, conversation_id, actor_id, kind, data, created_at";

export interface SubscribeToEventsOptions {
  /**
   * Also listen for the events only the team sees: assignment and priority. Asking for these
   * as a contact is refused.
   */
  team?: boolean;
}

export function createEvents(supabase: HelpwrenSupabaseClient) {
  return {
    /**
     * A conversation's events, oldest first. A contact gets the ones about where their request
     * stands; the team gets all of them.
     */
    async list(conversationId: string): Promise<ConversationEvent[]> {
      const { data, error } = await supabase
        .from("conversation_events")
        .select(COLUMNS)
        .eq("conversation_id", conversationId)
        .order("created_at");
      if (error) throw new HelpwrenError("Could not load the activity.", { cause: error });
      return z.array(conversationEventSchema).parse(data);
    },

    /** Calls back for each new event on a conversation. Resolves once listening has started. */
    async subscribe(
      conversationId: string,
      onEvent: (event: ConversationEvent) => void,
      options: SubscribeToEventsOptions = {},
    ): Promise<Unsubscribe> {
      // Events a contact may see travel with the messages; the rest with the team's notes.
      const topics = [
        `conversation:${conversationId}`,
        ...(options.team ? [`notes:${conversationId}`] : []),
      ];
      const stops = await Promise.all(
        topics.map((topic) =>
          listenForRows(supabase, topic, ["INSERT"], conversationEventSchema, onEvent),
        ),
      );
      return async () => {
        await Promise.all(stops.map((stop) => stop()));
      };
    },
  };
}

export type EventsApi = ReturnType<typeof createEvents>;

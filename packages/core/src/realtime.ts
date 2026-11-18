import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { type z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** Stops a subscription. Safe to call more than once. */
export type Unsubscribe = () => Promise<void>;

type ChangeEvent = "INSERT" | "UPDATE";

/**
 * Listens for rows the database broadcasts on a private channel, and resolves once the server
 * has accepted the subscription. Rows that do not match the schema are skipped: a newer server
 * must not be able to crash an older client.
 */
export async function listenForRows<Schema extends z.ZodType>(
  supabase: HelpwrenSupabaseClient,
  topic: string,
  events: readonly ChangeEvent[],
  schema: Schema,
  onRow: (row: z.infer<Schema>, event: ChangeEvent) => void,
): Promise<Unsubscribe> {
  // Private channels check the listener's session, so it has to be handed over first.
  await supabase.realtime.setAuth();
  const channel = supabase.channel(topic, { config: { private: true } });

  for (const event of events) {
    channel.on("broadcast", { event }, (message) => {
      const payload = message.payload as { record?: unknown } | undefined;
      const row = schema.safeParse(payload?.record);
      if (row.success) onRow(row.data, event);
    });
  }

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, cause) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        resolve();
      } else if (
        status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
        status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
      ) {
        reject(new HelpwrenError(`Could not listen for live updates on "${topic}".`, { cause }));
      }
    });
  }).catch(async (error: unknown) => {
    await supabase.removeChannel(channel);
    throw error;
  });

  return async () => {
    await supabase.removeChannel(channel);
  };
}

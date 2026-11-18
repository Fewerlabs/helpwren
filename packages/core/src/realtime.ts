import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from "@supabase/supabase-js";
import { type z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** Stops a subscription. Safe to call more than once. */
export type Unsubscribe = () => Promise<void>;

const CHANGE_EVENTS = ["INSERT", "UPDATE"] as const;
type ChangeEvent = (typeof CHANGE_EVENTS)[number];

type Listener = (event: ChangeEvent, record: unknown) => void;

/** One open channel, shared by everyone listening to its topic. */
interface SharedChannel {
  channel: RealtimeChannel | undefined;
  listeners: Set<Listener>;
  /** Resolves once the server has accepted the subscription. */
  ready: Promise<void>;
}

// Supabase allows one channel per topic on a client, so two parts of a screen that listen to
// the same thing have to share it. React also mounts effects twice in development, which
// makes that the common case, not a rare one.
const channelsByClient = new WeakMap<HelpwrenSupabaseClient, Map<string, SharedChannel>>();

function open(supabase: HelpwrenSupabaseClient, topic: string, shared: SharedChannel) {
  return (async () => {
    // Private channels check the listener's session, so it has to be handed over first.
    await supabase.realtime.setAuth();
    const channel = supabase.channel(topic, { config: { private: true } });
    shared.channel = channel;

    for (const event of CHANGE_EVENTS) {
      channel.on("broadcast", { event }, (message) => {
        const payload = message.payload as { record?: unknown } | undefined;
        for (const listener of shared.listeners) listener(event, payload?.record);
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
    });
  })();
}

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
  let channels = channelsByClient.get(supabase);
  if (!channels) {
    channels = new Map();
    channelsByClient.set(supabase, channels);
  }

  let shared = channels.get(topic);
  if (!shared) {
    const created: SharedChannel = {
      channel: undefined,
      listeners: new Set(),
      ready: Promise.resolve(),
    };
    created.ready = open(supabase, topic, created);
    channels.set(topic, created);
    shared = created;
  }
  const joined = shared;

  const listener: Listener = (event, record) => {
    if (!events.includes(event)) return;
    const row = schema.safeParse(record);
    if (row.success) onRow(row.data, event);
  };
  joined.listeners.add(listener);

  const leave: Unsubscribe = async () => {
    joined.listeners.delete(listener);
    // Wait a moment before closing: a listener that leaves is often replaced at once.
    await Promise.resolve();
    if (joined.listeners.size > 0 || channels.get(topic) !== joined) return;
    channels.delete(topic);
    await joined.ready.catch(() => undefined);
    if (joined.channel) await supabase.removeChannel(joined.channel);
  };

  try {
    await joined.ready;
  } catch (error) {
    await leave();
    throw error;
  }
  return leave;
}

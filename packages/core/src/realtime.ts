import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from "@supabase/supabase-js";
import { type z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** Stops a subscription. Safe to call more than once. */
export type Unsubscribe = () => Promise<void>;

const CHANGE_EVENTS = ["INSERT", "UPDATE"] as const;
type ChangeEvent = (typeof CHANGE_EVENTS)[number];

/** Who is present on a channel: one entry per person, by their presence key. */
export type PresenceState = Record<string, unknown[]>;

interface Listener {
  onBroadcast?: ((event: string, payload: unknown) => void) | undefined;
  onPresence?: ((state: PresenceState) => void) | undefined;
}

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

function channelsOf(supabase: HelpwrenSupabaseClient) {
  let channels = channelsByClient.get(supabase);
  if (!channels) {
    channels = new Map();
    channelsByClient.set(supabase, channels);
  }
  return channels;
}

function open(
  supabase: HelpwrenSupabaseClient,
  topic: string,
  shared: SharedChannel,
  presence: boolean,
) {
  return (async () => {
    // Private channels check the listener's session, so it has to be handed over first.
    await supabase.realtime.setAuth();
    // Presence is keyed by person, so someone with the screen open in two tabs counts once.
    // Someone with no session never shows themselves, so any key will do for them.
    let key: string = crypto.randomUUID();
    if (presence) {
      const { data } = await supabase.auth.getClaims();
      if (data) key = data.claims.sub;
    }
    const channel = supabase.channel(topic, {
      config: { private: true, ...(presence ? { presence: { key } } : {}) },
    });
    shared.channel = channel;

    channel.on("broadcast", { event: "*" }, (message) => {
      for (const listener of shared.listeners) {
        listener.onBroadcast?.(message.event, message.payload);
      }
    });
    if (presence) {
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        for (const listener of shared.listeners) listener.onPresence?.(state);
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

export interface JoinOptions extends Listener {
  /** Whether the channel carries presence. Fixed by whoever opens the topic first. */
  presence?: boolean;
}

/** A place on a shared channel, for sending on it and showing oneself, until `leave`. */
export interface ChannelHandle {
  channel: RealtimeChannel;
  leave: Unsubscribe;
}

/**
 * Joins a private channel, or the one already open on this client for the same topic, and
 * resolves once the server has accepted it. Rejects when the access rules turn the caller away.
 */
export async function joinChannel(
  supabase: HelpwrenSupabaseClient,
  topic: string,
  { presence = false, ...listener }: JoinOptions,
): Promise<ChannelHandle> {
  const channels = channelsOf(supabase);
  let shared = channels.get(topic);
  if (!shared) {
    const created: SharedChannel = {
      channel: undefined,
      listeners: new Set(),
      ready: Promise.resolve(),
    };
    created.ready = open(supabase, topic, created, presence);
    channels.set(topic, created);
    shared = created;
  }
  const joined = shared;
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
  if (!joined.channel) throw new HelpwrenError(`Could not join "${topic}".`);
  // Someone joining a presence channel late still needs to know who is already there.
  if (presence) listener.onPresence?.(joined.channel.presenceState());
  return { channel: joined.channel, leave };
}

/**
 * Shows the caller as present on a joined channel. Rejects, and leaves, when the access rules
 * do not let them be seen there: Realtime answers a refused presence with an error, not by
 * closing the channel.
 */
export async function trackOn({ channel, leave }: ChannelHandle): Promise<Unsubscribe> {
  const answer = await channel.track({});
  if (answer !== "ok") {
    await leave();
    throw new HelpwrenError(`Could not be present on "${channel.topic}": ${answer}.`);
  }
  return leave;
}

/**
 * Sends an event on a channel this client already has open, and does nothing when it has none:
 * a browser only sends where it is also listening, which is what keeps channels few.
 */
export async function sendOnOpenChannel(
  supabase: HelpwrenSupabaseClient,
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const shared = channelsOf(supabase).get(topic);
  if (!shared) return;
  await shared.ready.catch(() => undefined);
  if (shared.channel?.state !== "joined") return;
  await shared.channel.send({ type: "broadcast", event, payload });
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
  const { leave } = await joinChannel(supabase, topic, {
    onBroadcast: (event, payload) => {
      const change = CHANGE_EVENTS.find((name) => name === event);
      if (!change || !events.includes(change)) return;
      const row = schema.safeParse((payload as { record?: unknown } | undefined)?.record);
      if (row.success) onRow(row.data, change);
    },
  });
  return leave;
}

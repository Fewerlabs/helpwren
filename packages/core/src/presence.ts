import { z } from "zod";

import {
  joinChannel,
  sendOnOpenChannel,
  trackOn,
  type PresenceState,
  type Unsubscribe,
} from "./realtime";
import { type HelpwrenSupabaseClient } from "./supabase";

/** While someone keeps typing, they say so at most this often. */
export const TYPING_THROTTLE_MS = 2500;
/**
 * How long "is typing" stays up after the last word from someone. A little longer than the
 * throttle, so a steady typist never flickers, and short enough that a closed tab clears soon.
 */
export const TYPING_TIMEOUT_MS = 5000;

const TYPING_EVENT = "typing";

/** What a browser sends on `typing:<conversation id>`. Never stored. */
export const typingEventSchema = z.object({
  userId: z.uuid(),
  typing: z.boolean(),
  /** The writer's name and photo, sent by the team so the visitor can see who is replying. */
  name: z.string().max(120).optional(),
  avatar: z
    .url({ protocol: /^https?$/ })
    .max(2000)
    .optional(),
});

export type TypingEvent = z.infer<typeof typingEventSchema>;

/** Someone writing in a conversation now. */
export interface Typist {
  userId: string;
  name?: string | undefined;
  avatar?: string | undefined;
}

/** How the sender shows up to the other side while typing. The team gives a name and photo. */
export interface TypingSender {
  name?: string | undefined;
  avatar?: string | undefined;
}

export interface TypingChannel {
  /** Call on every keystroke. Sends at most one event per `TYPING_THROTTLE_MS`. */
  start: () => void;
  /** Call when the writer sends, clears the box or leaves it. Sends only if they were typing. */
  stop: () => void;
  /**
   * Calls back with everyone else typing in the conversation, each time that changes. Joining
   * here is what opens the channel; `start` and `stop` send on it only while it is open.
   */
  subscribe: (onChange: (typists: Typist[]) => void) => Promise<Unsubscribe>;
}

/** Everyone present on a channel, by their presence key, which is their user id. */
const presentIds = (state: PresenceState) => Object.keys(state);

export function createPresence(supabase: HelpwrenSupabaseClient) {
  /** The signed-in person's id, asked for once per typing channel. */
  async function myId() {
    const { data } = await supabase.auth.getClaims();
    return data?.claims.sub;
  }

  return {
    /** Typing in one conversation, for its contact and the team alike. */
    typing(conversationId: string, sender: TypingSender = {}): TypingChannel {
      const topic = `typing:${conversationId}`;
      const me = myId();
      let lastSent = 0;
      let typing = false;

      const send = (isTyping: boolean) => {
        void me
          .then((userId) => {
            if (!userId) return undefined;
            const event: TypingEvent = {
              userId,
              typing: isTyping,
              ...(sender.name ? { name: sender.name } : {}),
              ...(sender.avatar ? { avatar: sender.avatar } : {}),
            };
            return sendOnOpenChannel(supabase, topic, TYPING_EVENT, event);
          })
          // "Is typing" is a nicety. A failure to say so must not reach the writer.
          .catch(() => undefined);
      };

      return {
        start() {
          const now = Date.now();
          if (typing && now - lastSent < TYPING_THROTTLE_MS) return;
          typing = true;
          lastSent = now;
          send(true);
        },
        stop() {
          if (!typing) return;
          typing = false;
          lastSent = 0;
          send(false);
        },
        async subscribe(onChange) {
          const typists = new Map<string, Typist>();
          const timers = new Map<string, ReturnType<typeof setTimeout>>();
          const report = () => {
            onChange([...typists.values()]);
          };
          const drop = (userId: string) => {
            clearTimeout(timers.get(userId));
            timers.delete(userId);
            if (typists.delete(userId)) report();
          };

          const { leave } = await joinChannel(supabase, topic, {
            onBroadcast: (event, payload) => {
              if (event !== TYPING_EVENT) return;
              const parsed = typingEventSchema.safeParse(payload);
              if (!parsed.success) return;
              const { userId, typing: isTyping, name, avatar } = parsed.data;
              if (!isTyping) {
                drop(userId);
                return;
              }
              clearTimeout(timers.get(userId));
              timers.set(
                userId,
                setTimeout(() => {
                  drop(userId);
                }, TYPING_TIMEOUT_MS),
              );
              typists.set(userId, { userId, name, avatar });
              report();
            },
          });

          return async () => {
            for (const timer of timers.values()) clearTimeout(timer);
            timers.clear();
            typists.clear();
            await leave();
          };
        },
      };
    },

    /**
     * Shows the signed-in team member as viewing a conversation, and calls back with the ids of
     * every team member viewing it, themselves included, each time that changes.
     */
    async viewing(
      conversationId: string,
      onChange: (agentIds: string[]) => void,
    ): Promise<Unsubscribe> {
      const handle = await joinChannel(supabase, `viewing:${conversationId}`, {
        presence: true,
        onPresence: (state) => {
          onChange(presentIds(state));
        },
      });
      return trackOn(handle);
    },

    /** Whether the team is around: who has the dashboard open. */
    team: {
      /** Counts the signed-in team member as online until the returned function is called. */
      async join(): Promise<Unsubscribe> {
        return trackOn(await joinChannel(supabase, "presence:team", { presence: true }));
      },

      /**
       * Calls back with how many team members are online, each time that changes. Anyone may
       * watch, signed in or not; only the team can be counted.
       */
      async watch(onChange: (online: number) => void): Promise<Unsubscribe> {
        const { leave } = await joinChannel(supabase, "presence:team", {
          presence: true,
          onPresence: (state) => {
            onChange(presentIds(state).length);
          },
        });
        return leave;
      },
    },
  };
}

export type PresenceApi = ReturnType<typeof createPresence>;

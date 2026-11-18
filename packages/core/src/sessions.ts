import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

export interface Session {
  /** The id of whoever is using this device: a guest, a user or a team member. */
  id: string;
  isGuest: boolean;
}

export function createSessions(supabase: HelpwrenSupabaseClient) {
  async function current(): Promise<Session | null> {
    const { data } = await supabase.auth.getClaims();
    if (!data) return null;
    return { id: data.claims.sub, isGuest: data.claims.is_anonymous === true };
  }

  return {
    /** The session on this device, or `null` if there is none. */
    current,

    /**
     * Makes sure this device has a session, creating a guest one if it has none. A returning
     * visitor keeps the session they had, and with it their conversations.
     */
    async startGuest(): Promise<Session> {
      const existing = await current();
      if (existing) return existing;

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.user) {
        throw new HelpwrenError("Could not start a guest session.", { cause: error });
      }
      return { id: data.user.id, isGuest: true };
    },
  };
}

export type SessionsApi = ReturnType<typeof createSessions>;

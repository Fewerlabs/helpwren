import { type Api } from "./api";
import { HelpwrenError } from "./errors";
import { identifyResponseSchema, type IdentifyResult } from "./identity";
import { type HelpwrenSupabaseClient } from "./supabase";

export interface Session {
  /** The id of whoever is using this device: a guest, a user or a team member. */
  id: string;
  isGuest: boolean;
}

export function createSessions(supabase: HelpwrenSupabaseClient, api: Api) {
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

    /**
     * Signs this device in as one of the host product's users, with a token the host page was
     * given for them. A guest session on this device is sent along, and what the guest did
     * becomes the user's. If this device is already signed in as that user, nothing changes.
     */
    async identify(token: string): Promise<IdentifyResult> {
      const result = await api.post("/api/identify", { token }, identifyResponseSchema);
      if (!result.ok) {
        if (result.code === "token_expired") return { ok: false, reason: "expired" };
        if (result.code === "token_rejected") return { ok: false, reason: "rejected" };
        if (result.code === "forbidden") return { ok: false, reason: "off" };
        throw new HelpwrenError(`Could not identify the user: ${result.message}`);
      }

      const { userId, session, mergedConversations } = result.data;
      if (session) {
        const { error } = await supabase.auth.setSession({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
        });
        if (error) throw new HelpwrenError("Could not load the user's session.", { cause: error });
      }
      return { ok: true, userId, mergedConversations };
    },

    /**
     * Forgets who is using this device, for when they log out of the host product. Only this
     * device is signed out. The next message starts a new guest.
     */
    async reset(): Promise<void> {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new HelpwrenError("Could not end the session.", { cause: error });
    },
  };
}

export type SessionsApi = ReturnType<typeof createSessions>;

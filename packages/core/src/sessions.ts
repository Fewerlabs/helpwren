import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { z } from "zod";

import { type Api } from "./api";
import { HelpwrenError } from "./errors";
import { guestCheckSchema, identifyResponseSchema, type IdentifyResult } from "./identity";
import { type HelpwrenSupabaseClient } from "./supabase";

export interface Session {
  /** The id of whoever is using this device: a guest, a user or a team member. */
  id: string;
  isGuest: boolean;
}

/** What a contact has said about themselves, which decides whether they are asked again. */
export interface OwnDetails {
  name: string | null;
  email: string | null;
  phone: string | null;
  verified: boolean;
}

/** The part of the browser's Web Locks API used here. Missing in older browsers and in Node. */
interface LockManagerLike {
  request<Result>(name: string, task: () => Promise<Result>): Promise<Result>;
}

/**
 * Runs a task while no other tab of this site runs it, where the browser can say so. Two tabs
 * that each find no session would otherwise each start a guest, and one would lose.
 */
function exclusively<Result>(task: () => Promise<Result>): Promise<Result> {
  const holder: { navigator?: { locks?: LockManagerLike } } = globalThis;
  const locks = holder.navigator?.locks;
  return locks ? locks.request("helpwren.guest", task) : task();
}

export function createSessions(supabase: HelpwrenSupabaseClient, api: Api) {
  /**
   * The session on this device, or `null` if there is none. A session that cannot be checked
   * just now, because the network is not there, throws: it is still on the device, and
   * treating it as gone would start a new guest in its place.
   */
  async function current(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getClaims();
    if (data) return { id: data.claims.sub, isGuest: data.claims.is_anonymous === true };
    if (isAuthRetryableFetchError(error)) {
      throw new HelpwrenError("Could not check the session. Try again.", { cause: error });
    }
    return null;
  }

  async function signInGuest(): Promise<Session> {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      throw new HelpwrenError("Could not start a guest session.", { cause: error });
    }
    return { id: data.user.id, isGuest: true };
  }

  /**
   * Ties the guest signed in on this device to the install's key for this browser, a cookie
   * the page cannot read. When the key is another guest's, this browser lost that guest's
   * session, and what they had becomes this guest's. Best effort: the chat works without it,
   * and the next call tries again.
   */
  async function link(): Promise<void> {
    await api.post("/api/guest", {}, z.undefined()).catch(() => undefined);
  }

  /** Brings back the guest this browser had before it lost their session, if it can. */
  async function restore(): Promise<Session | null> {
    const check = await api.post("/api/guest/check", {}, guestCheckSchema);
    if (!check.ok || !check.data.restorable) return null;
    const guest = await signInGuest();
    await link();
    return guest;
  }

  return {
    current,

    /**
     * The session on this device, as the chat opens. A guest whose session the browser lost,
     * but whose key it kept, gets a new session with their conversations. No guest is started
     * for someone who has never written.
     */
    async resume(): Promise<Session | null> {
      const existing = await current();
      if (existing) {
        if (existing.isGuest) await link();
        return existing;
      }
      return exclusively(async () => (await current()) ?? (await restore()));
    },

    /**
     * Makes sure this device has a session, creating a guest one if it has none. A returning
     * visitor keeps the session they had, and with it their conversations.
     */
    async startGuest(): Promise<Session> {
      const existing = await current();
      if (existing) return existing;
      return exclusively(async () => {
        const started = await current();
        if (started) return started;
        const guest = await signInGuest();
        await link();
        return guest;
      });
    },

    /**
     * What the person on this device has said about themselves, or `null` for someone who has
     * never written.
     */
    async details(): Promise<OwnDetails | null> {
      const session = await current();
      if (!session) return null;
      const { data, error } = await supabase
        .from("contacts")
        .select("name, email, phone, verified")
        .eq("id", session.id)
        .maybeSingle();
      if (error) throw new HelpwrenError("Could not load your details.", { cause: error });
      return data;
    },

    /**
     * Calls back when the session on this device ends without being asked to, such as a
     * refresh Supabase Auth refused. Returns a function that stops listening.
     */
    onSignedOut(callback: () => void): () => void {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") callback();
      });
      return () => {
        data.subscription.unsubscribe();
      };
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
        if (result.code === "identity_unavailable") return { ok: false, reason: "unavailable" };
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
     * device is signed out, and the browser's guest key is given up, so the guest is not
     * brought back. The next message starts a new guest.
     */
    async reset(): Promise<void> {
      // Signed out even when the key could not be given up, and said so after.
      const forgotten = await api.delete("/api/guest", z.undefined()).then(
        (result) => result.ok,
        () => false,
      );
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new HelpwrenError("Could not end the session.", { cause: error });
      if (!forgotten) throw new HelpwrenError("Could not forget this browser's guest.");
    },
  };
}

export type SessionsApi = ReturnType<typeof createSessions>;

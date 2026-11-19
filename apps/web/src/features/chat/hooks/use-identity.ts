import { useQueryClient } from "@tanstack/react-query";
import { type IdentityState } from "helpwren/protocol";
import { useMemo } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { useShowScreen } from "../store/chat-store";

/**
 * Changing who the chat is signed in as, on the word of the page around it. Each of these
 * resolves to what the page should be told: a user, a guest, or why it could not be done.
 */
export function useIdentity() {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const show = useShowScreen();

  return useMemo(() => {
    /** Signs out, and shows the chat as a new visitor sees it. */
    async function forget() {
      await getClient().sessions.reset();
      show({ name: "home" });
      // Not waited for: a refetch that fails now there is no session is retried for seconds,
      // and the page should hear that the visitor is a guest at once.
      void queryClient.resetQueries();
    }

    /**
     * Signs out if the chat is signed in as a user. A guest is left alone: their session is
     * theirs whether or not the page knows them.
     */
    async function dropUser() {
      const session = await getClient().sessions.current();
      if (session && !session.isGuest) await forget();
    }

    return {
      /** Signs in as the user a token is for. A token that is not accepted signs a user out. */
      async signIn(token: string): Promise<IdentityState> {
        try {
          const result = await getClient().sessions.identify(token);
          if (!result.ok) {
            // Unable to ask is not the same as being told no: whoever is signed in stays.
            if (result.reason === "unavailable") return { state: "failed", reason: "error" };
            await dropUser();
            return { state: "failed", reason: result.reason };
          }
          // Everything is asked for again: the conversations, and who sent which message.
          await queryClient.invalidateQueries();
          return { state: "user" };
        } catch {
          return { state: "failed", reason: "error" };
        }
      },

      /** For a page that does not vouch for a user: the chat may only be a guest's. */
      async asGuest(): Promise<IdentityState> {
        await dropUser().catch(() => undefined);
        return { state: "guest" };
      },

      /** The visitor logged out of the page: whoever the chat was, guest or user, is forgotten. */
      async reset(): Promise<IdentityState> {
        await forget().catch(() => undefined);
        return { state: "guest" };
      },
    };
  }, [getClient, queryClient, show]);
}

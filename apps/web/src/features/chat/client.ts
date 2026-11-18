import { createHelpwrenClient, type Database, type HelpwrenClient } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let client: HelpwrenClient | undefined;

/**
 * The Helpwren client for the visitor in this browser. Their session is kept in the browser's
 * own storage, not in cookies: the chat runs in a frame on someone else's site, where browsers
 * block cookies. Call it from effects, event handlers and query functions, never while rendering
 * on the server.
 */
export function getChatClient(): HelpwrenClient {
  client ??= createHelpwrenClient({
    supabase: createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { storageKey: "helpwren.session" } },
    ),
  });
  return client;
}

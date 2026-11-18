import { createHelpwrenClient, type Database, type HelpwrenClient } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

let client: HelpwrenClient | undefined;

/**
 * The Helpwren client for a reader of the help center, in the browser. A reader has no session
 * and needs none: published articles are public, and so is saying whether one helped. Call it
 * from event handlers, never while rendering on the server.
 */
export function getReaderClient(): HelpwrenClient {
  client ??= createHelpwrenClient({
    supabase: createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ),
  });
  return client;
}

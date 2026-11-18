import { createHelpwrenClient, type Database, type HelpwrenClient } from "@helpwren/core";
import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

let client: HelpwrenClient | undefined;

/**
 * The Helpwren client for the team member in this browser. It shares the session the sign-in
 * page put in cookies, so the inbox needs no sign-in of its own. Call it from effects, event
 * handlers and query functions, never while rendering on the server.
 */
export function getInboxClient(): HelpwrenClient {
  client ??= createHelpwrenClient({
    supabase: createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  });
  return client;
}

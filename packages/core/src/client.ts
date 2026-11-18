import { createAgents } from "./agents";
import { createAuth } from "./auth";
import { createSettings } from "./settings";
import { type HelpwrenSupabaseClient } from "./supabase";

export interface HelpwrenClientOptions {
  /**
   * The Supabase client to talk through. The caller builds it, because how a session is stored
   * depends on where the code runs: cookies on a server, memory or local storage in a browser.
   */
  supabase: HelpwrenSupabaseClient;
}

/**
 * The headless Helpwren client. Every screen, official or custom, goes through this and never
 * reads the database tables directly.
 */
export function createHelpwrenClient({ supabase }: HelpwrenClientOptions) {
  const agents = createAgents(supabase);

  return {
    auth: createAuth(supabase, agents),
    agents,
    settings: createSettings(supabase),
  };
}

export type HelpwrenClient = ReturnType<typeof createHelpwrenClient>;

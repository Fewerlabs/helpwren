import { createAgents } from "./agents";
import { createApi, type ApiOptions } from "./api";
import { createAuth } from "./auth";
import { createContacts } from "./contacts";
import { createConversations } from "./conversations";
import { createEvents } from "./events";
import { createMessages } from "./messages";
import { createNotes } from "./notes";
import { createSessions } from "./sessions";
import { createSettings } from "./settings";
import { type HelpwrenSupabaseClient } from "./supabase";

export interface HelpwrenClientOptions extends ApiOptions {
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
export function createHelpwrenClient({ supabase, ...apiOptions }: HelpwrenClientOptions) {
  const agents = createAgents(supabase);
  const api = createApi(supabase, apiOptions);

  return {
    auth: createAuth(supabase, agents),
    agents,
    sessions: createSessions(supabase),
    contacts: createContacts(supabase),
    conversations: createConversations(supabase, api),
    events: createEvents(supabase),
    messages: createMessages(supabase),
    notes: createNotes(supabase),
    settings: createSettings(supabase),
  };
}

export type HelpwrenClient = ReturnType<typeof createHelpwrenClient>;

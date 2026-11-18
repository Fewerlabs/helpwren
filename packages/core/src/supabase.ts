import { type SupabaseClient } from "@supabase/supabase-js";

import { type Database } from "./database.types";

/** A Supabase client typed against Helpwren's schema. */
export type HelpwrenSupabaseClient = SupabaseClient<Database>;

import "server-only";

import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/server-env";

import { supabaseServerUrl } from "./server-url";

/**
 * A Supabase client that uses the secret key, so the access rules do not apply to it. Use it
 * only after checking who is asking and what they may do, and only for what the rules leave to
 * the server. It holds no session, so one client serves every request.
 */
export const supabaseAdmin = createClient<Database>(
  supabaseServerUrl,
  serverEnv.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

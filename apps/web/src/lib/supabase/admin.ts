import "server-only";

import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

/**
 * A Supabase client that uses the secret key, so the access rules do not apply to it. Use it
 * only after checking who is asking and what they may do, and only for what the rules leave to
 * the server. It holds no session, so one client serves every request.
 */
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

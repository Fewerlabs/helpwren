import "server-only";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

/**
 * The address the app's server reaches Supabase at. Usually the public one. When the app runs
 * beside Supabase in Docker, the public address can point back at the app's own container, so
 * `SUPABASE_INTERNAL_URL` names the gateway on the private network instead.
 */
export const supabaseServerUrl = serverEnv.SUPABASE_INTERNAL_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * The name of the session cookie. Supabase derives it from the address it is given, so the
 * server takes it from the public address the browser uses, whichever address it talks to.
 */
export const authCookieName = `sb-${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0] ?? ""}-auth-token`;

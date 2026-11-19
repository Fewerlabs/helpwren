import "server-only";

import { type Database } from "@helpwren/core";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

import { authCookieName, supabaseServerUrl } from "./server-url";

/**
 * A Supabase client for Server Components, Server Actions and Route Handlers. It acts as the
 * person whose session is in the request's cookies, so the access rules apply. Create one per
 * request; never share one between requests.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseServerUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { ...SESSION_COOKIE_OPTIONS, name: authCookieName },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: the proxy refreshes the
          // session before a Server Component runs, so there is nothing new to store here.
        }
      },
    },
  });
}

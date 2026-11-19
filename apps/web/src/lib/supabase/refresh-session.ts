import { type Database } from "@helpwren/core";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

import { authCookieName, supabaseServerUrl } from "./server-url";

/**
 * Refreshes the session in the request's cookies if it is about to run out, and returns the
 * response that carries the new cookies. Called from the proxy, which is the one place a
 * session is refreshed: refreshing in two places at once can sign a person out.
 */
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseServerUrl,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: { name: authCookieName },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Tells caches never to store a response that sets someone's session.
          for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
          }
        },
      },
    },
  );

  // Checking the session is what triggers the refresh. Who the person is, and whether they
  // may see a page, is decided where the page is rendered.
  await supabase.auth.getClaims();

  return response;
}

import { parseSettings } from "@helpwren/core";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { frameAncestorSources } from "@/lib/frame-ancestors";
import { EMBED_HEADER, parseHelpEmbed } from "@/lib/help-embed";
import { contentSecurityPolicy } from "@/lib/security-headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshSession } from "@/lib/supabase/refresh-session";

/**
 * Sets the page's Content-Security-Policy. Built here, on each request, and not in the Next.js
 * config, which is fixed at build time: the policy names the install's Supabase project, and
 * the allowed domains an admin can change at any time.
 */
function secure(response: NextResponse, frameAncestors: string[] | "any" = []): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicy({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      frameAncestors,
      development: env.NODE_ENV === "development",
    }),
  );
  return response;
}

/**
 * The sites that may show this page in a frame: the install's allowed domains. The same rule
 * covers the chat and the embedded help center.
 */
async function allowedFramers(): Promise<string[] | "any"> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("key", "allowed_domains");
  if (error) throw error;
  return frameAncestorSources(parseSettings(data).allowedDomains);
}

/**
 * The help center, which a host may show in a frame with `?embed=1`. What the host asked for
 * is checked here and handed to the pages in a header. The header is always set or removed
 * here, so one sent by a browser means nothing.
 */
async function help(request: NextRequest): Promise<NextResponse> {
  const headers = new Headers(request.headers);
  headers.delete(EMBED_HEADER);
  const embed = parseHelpEmbed(request.nextUrl.searchParams);
  if (!embed) return secure(NextResponse.next({ request: { headers } }));

  headers.set(EMBED_HEADER, request.nextUrl.searchParams.toString());
  return secure(NextResponse.next({ request: { headers } }), await allowedFramers());
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/embed")) return secure(NextResponse.next(), await allowedFramers());
  if (pathname.startsWith("/help") && !pathname.startsWith("/help/preview")) return help(request);
  // The dashboard, the sign-in page and a team member's preview of a draft have sessions to
  // refresh. Only the app itself may frame them, which stops another site tricking a team
  // member into clicking inside one.
  if (
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname.startsWith("/help/preview")
  ) {
    return secure(await refreshSession(request));
  }
  return secure(NextResponse.next());
}

export const config = {
  // Every page. Not the API, which answers with data and sets its own headers, and not files
  // that are served as they are.
  matcher: ["/((?!api/|_next/static|_next/image|widget\\.js|icon\\.svg|favicon\\.ico).*)"],
};

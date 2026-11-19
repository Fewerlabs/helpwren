import { parseSettings } from "@helpwren/core";
import { NextResponse, type NextRequest } from "next/server";

import { frameAncestorsPolicy } from "@/lib/frame-ancestors";
import { EMBED_HEADER, parseHelpEmbed } from "@/lib/help-embed";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshSession } from "@/lib/supabase/refresh-session";

/**
 * Tells the browser which sites may show this page in a frame: the install's allowed domains.
 * The same rule covers the chat and the embedded help center.
 */
async function limitFraming(response = NextResponse.next()): Promise<NextResponse> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("key", "allowed_domains");
  if (error) throw error;

  const policy = frameAncestorsPolicy(parseSettings(data).allowedDomains);
  if (policy) response.headers.set("Content-Security-Policy", policy);
  return response;
}

/**
 * The help center, which a host may show in a frame with `?embed=1`. What the host asked for
 * is checked here and handed to the pages in a header. The header is always set or removed
 * here, so one sent by a browser means nothing.
 */
function help(request: NextRequest): NextResponse | Promise<NextResponse> {
  const headers = new Headers(request.headers);
  headers.delete(EMBED_HEADER);
  const embed = parseHelpEmbed(request.nextUrl.searchParams);
  if (!embed) return NextResponse.next({ request: { headers } });

  headers.set(EMBED_HEADER, request.nextUrl.searchParams.toString());
  return limitFraming(NextResponse.next({ request: { headers } }));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/embed")) return limitFraming();
  if (pathname.startsWith("/help") && !pathname.startsWith("/help/preview")) return help(request);
  return refreshSession(request);
}

export const config = {
  // The dashboard, the sign-in page, the setup wizard and a team member's preview of a draft have sessions to
  // refresh; the chat has a framing rule to set, and so has the help center when a host embeds
  // it. Other routes skip the proxy entirely.
  matcher: ["/dashboard/:path*", "/login", "/setup", "/embed", "/help", "/help/:path*"],
};

import { parseSettings } from "@helpwren/core";
import { NextResponse, type NextRequest } from "next/server";

import { frameAncestorsPolicy } from "@/lib/frame-ancestors";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshSession } from "@/lib/supabase/refresh-session";

/** Tells the browser which sites may show the chat in a frame: the install's allowed domains. */
async function limitFraming(): Promise<NextResponse> {
  const response = NextResponse.next();
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("key", "allowed_domains");
  if (error) throw error;

  const policy = frameAncestorsPolicy(parseSettings(data).allowedDomains);
  if (policy) response.headers.set("Content-Security-Policy", policy);
  return response;
}

export function proxy(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/embed") ? limitFraming() : refreshSession(request);
}

export const config = {
  // The dashboard, the sign-in page and a team member's preview of a draft have sessions to
  // refresh; the chat has a framing rule to set. Other routes skip the proxy entirely.
  matcher: ["/dashboard/:path*", "/login", "/embed", "/help/preview/:path*"],
};

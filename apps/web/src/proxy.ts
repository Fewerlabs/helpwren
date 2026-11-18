import { type NextRequest } from "next/server";

import { refreshSession } from "@/lib/supabase/refresh-session";

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Only the inbox has signed-in sessions so far. Other routes skip the proxy entirely.
  matcher: ["/inbox/:path*"],
};

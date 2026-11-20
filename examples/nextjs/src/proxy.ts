import { NextResponse, type NextRequest } from "next/server";

import { surfaceOf } from "@/lib/config";

/**
 * One server, two hostnames: `www.glown.localhost` is the public site (`src/app/site`) and
 * `app.glown.localhost` is the web app (`src/app/webapp`). Glown runs them as two deployments;
 * what matters to Helpwren is that they are two hostnames of the same site.
 */
export function proxy(request: NextRequest): NextResponse {
  const surface = surfaceOf(request.headers.get("host") ?? "");
  const url = request.nextUrl.clone();
  url.pathname = `/${surface === "app" ? "webapp" : "site"}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Not the API, not the help center (rewritten to the install in next.config.ts), not Next's
  // own files and not the brand files in public/brand.
  matcher: ["/((?!api/|help$|help/|_next/|brand/|favicon\\.ico).*)"],
};

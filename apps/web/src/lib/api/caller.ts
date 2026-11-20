import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Who is making an API request, once their session has been verified. */
export interface Caller {
  id: string;
  isAgent: boolean;
  /** True for a visitor with a guest session, who has not been identified as anyone. */
  isGuest: boolean;
}

const BEARER = /^Bearer (.+)$/;

async function verifiedClaims(request: Request) {
  // The chat frame and other API clients send their session as a bearer token; the inbox,
  // which lives on this site, sends it in cookies.
  const token = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  if (token) return (await supabaseAdmin.auth.getClaims(token)).data?.claims ?? null;

  // A browser sends cookies along with a request another site started. Such a request is not
  // the team member's own doing, so their cookies are not taken as their word.
  if (request.headers.get("sec-fetch-site") === "cross-site") return null;
  const { data } = await (await createSupabaseServerClient()).auth.getClaims();
  return data?.claims ?? null;
}

/** The verified caller of a request, or `null` if it carries no valid session. */
export async function getCaller(request: Request): Promise<Caller | null> {
  const claims = await verifiedClaims(request);
  if (!claims) return null;
  const id = claims.sub;

  const { data: agent, error } = await supabaseAdmin
    .from("agents")
    .select("user_id")
    .eq("user_id", id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;

  return { id, isAgent: agent !== null, isGuest: claims.is_anonymous === true };
}

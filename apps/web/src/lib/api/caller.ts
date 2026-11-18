import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Who is making an API request, once their session has been verified. */
export interface Caller {
  id: string;
  isAgent: boolean;
}

const BEARER = /^Bearer (.+)$/;

async function verifiedUserId(request: Request): Promise<string | null> {
  // The chat frame and other API clients send their session as a bearer token; the inbox,
  // which lives on this site, sends it in cookies.
  const token = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  const { data } = token
    ? await supabaseAdmin.auth.getClaims(token)
    : await (await createSupabaseServerClient()).auth.getClaims();
  return data?.claims.sub ?? null;
}

/** The verified caller of a request, or `null` if it carries no valid session. */
export async function getCaller(request: Request): Promise<Caller | null> {
  const id = await verifiedUserId(request);
  if (!id) return null;

  const { data: agent, error } = await supabaseAdmin
    .from("agents")
    .select("user_id")
    .eq("user_id", id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;

  return { id, isAgent: agent !== null };
}

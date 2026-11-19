import { z } from "zod";

import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { supabaseAdmin } from "@/lib/supabase/admin";

const inputSchema = z.object({ helpful: z.boolean() });

// A reader of a help center that a host serves under its own address calls this from that
// address. Nothing here depends on who is asking, so any site may.
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST",
  "access-control-allow-headers": "content-type",
};

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: cors });
}

function withCors(response: Response): Response {
  for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
  return response;
}

/**
 * Records a reader's answer to "Was this helpful?" on a published article. Readers have no
 * session, so their network is what is counted: one answer per article a day, and a few dozen
 * an hour in all. An answer past that is thanked for and not counted, so a script learns
 * nothing from trying again.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/articles/[id]/feedback">,
): Promise<Response> {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return withCors(apiError("not_found", "No such article."));
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return withCors(apiError("invalid_request", z.prettifyError(input.error)));

  const { data: article, error: readError } = await supabaseAdmin
    .from("articles")
    .select("id")
    .eq("id", id.data)
    .eq("status", "published")
    .maybeSingle();
  if (readError) throw readError;
  if (!article) return withCors(apiError("not_found", "No such article."));

  const network = requestNetwork(request).key;
  const limited = await checkLimits([[LIMITS.feedbackPerNetwork, network]]);
  if (limited) return withCors(limited);
  const counted = !(await checkLimits([
    [LIMITS.feedbackPerArticle, network && `${network}:${article.id}`],
  ]));

  if (counted) {
    const { error } = await supabaseAdmin
      .from("article_feedback")
      .insert({ article_id: article.id, helpful: input.data.helpful });
    if (error) throw error;
  }
  return withCors(new Response(null, { status: 204 }));
}

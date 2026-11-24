import { pageHelpInputSchema } from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { audienceOf, resolvePageHelp } from "@/lib/contextual-help";

/**
 * The help for the page the chat is on: the page's own filter, the first of the team's rules
 * that matches, or a search on the page's title. The chat asks from the install's own origin,
 * so no other site is answered. A verified user's audience comes from their session, never
 * from what the page says; the page may only say whose articles to list.
 */
export async function POST(request: Request): Promise<Response> {
  const limited = await checkLimits([[LIMITS.pageHelpPerNetwork, requestNetwork(request).key]]);
  if (limited) return limited;

  const input = pageHelpInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));

  // Opening the chat starts no session, so most visitors ask without one.
  const caller = request.headers.has("authorization") ? await getCaller(request) : null;
  const audience = caller && !caller.isAgent ? await audienceOf(caller.id) : null;
  return Response.json(
    await resolvePageHelp({
      page: input.data.page,
      filter: input.data.filter,
      audience,
      pageAudience: input.data.audience,
    }),
  );
}

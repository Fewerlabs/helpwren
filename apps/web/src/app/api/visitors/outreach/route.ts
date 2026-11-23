import { claimOutreachInputSchema } from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { installSettings } from "@/lib/api/install-settings";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Postgres's code for a value a function refuses, such as a team member's id. */
const REFUSED = "22023";

/**
 * Takes up the message the team left for this browser. The chat calls it once a check-in says
 * one is waiting, with a guest session it started for the purpose if it had none. The message
 * becomes a conversation of that session's contact, from the team member who wrote it.
 */
export async function POST(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return apiError("unauthorized", "Start a session before taking up a message.");
  if (caller.isAgent) return apiError("forbidden", "Team members cannot take up a message.");

  const limited = await checkLimits([
    [LIMITS.outreachPerNetwork, requestNetwork(request).key],
    [LIMITS.outreachPerSession, caller.id],
  ]);
  if (limited) return limited;

  const input = claimOutreachInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));
  const { visitorId, source, page } = input.data;

  const settings = await installSettings();
  if (!settings.visitors.tracking || !settings.visitors.liveList) {
    return apiError("disabled", "This install does not start conversations with visitors.");
  }

  const { data: conversationId, error } = await supabaseAdmin.rpc("claim_visitor_outreach", {
    visitor_id: visitorId,
    contact_id: caller.id,
    source,
    context: {
      ...page,
      ...(request.headers.has("user-agent")
        ? { userAgent: request.headers.get("user-agent") }
        : {}),
    },
  });
  if (error) {
    if (error.code === REFUSED) return apiError("forbidden", error.message);
    throw error;
  }
  // The function answers null when nothing was waiting, though its declared type is a string.
  return Response.json({ conversationId: z.uuid().nullable().parse(conversationId) });
}

import { visitorCheckInInputSchema } from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { installSettings } from "@/lib/api/install-settings";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { locationFromHeaders } from "@/lib/geo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseUserAgent } from "@/lib/user-agent";

/** The referrer, unless it is another page of the same site, which says nothing new. */
function outsideReferrer(referrer: string | undefined, page: string): string | undefined {
  if (!referrer) return undefined;
  return new URL(referrer).host === new URL(page).host ? undefined : referrer;
}

/** The parts of a record that hold a value, for a database call that takes each as optional. */
function present<Values extends Record<string, unknown>>(values: Values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== undefined),
  ) as { [Key in keyof Values]?: NonNullable<Values[Key]> };
}

/**
 * A browser saying which page it is on. Anyone may call it: a visitor who is only browsing has
 * no session. A session, when there is one, says which contact the browser belongs to. The
 * browser and the location are read from the request; the address it came from is not kept.
 */
export async function POST(request: Request): Promise<Response> {
  const input = visitorCheckInInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));
  const { visitorId, page, referrer, language, timezone } = input.data;

  const settings = await installSettings();
  if (!settings.visitors.tracking) {
    return apiError("disabled", "This install does not keep track of visitors.");
  }
  // The browser's id is made up by the browser, so the network is counted as well: a script
  // inventing a new id for every request is still one network.
  const limited = await checkLimits([
    [LIMITS.checkInPerNetwork, requestNetwork(request).key],
    [LIMITS.checkInPerVisitor, visitorId],
  ]);
  if (limited) return limited;

  // Only a token the chat sent: a cookie on this site would be a team member trying things out.
  const caller = request.headers.has("authorization") ? await getCaller(request) : null;
  const contactId = caller && !caller.isAgent ? caller.id : null;

  const { data: outreach, error } = await supabaseAdmin.rpc("record_visit", {
    visitor_id: visitorId,
    page_url: page.url,
    ...present({
      page_title: page.title,
      referrer: outsideReferrer(referrer, page.url),
      language,
      timezone,
      contact_id: contactId,
      ...parseUserAgent(request.headers.get("user-agent")),
      ...locationFromHeaders(request.headers),
    }),
  });
  if (error) throw error;

  return Response.json({ outreach });
}

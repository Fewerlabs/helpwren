import { IdentityError, type VerifiedIdentity } from "@helpwren/adapters";
import { identifyInputSchema, type IdentifyResponse } from "@helpwren/core";
import { z } from "zod";

import { apiError } from "@/lib/api/respond";
import { verifyIdentity } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionForUser } from "@/lib/supabase/user-session";

/**
 * Signs the chat in as one of the host product's users. The page hands over a token; the
 * install's identity adapter confirms who it belongs to; and the answer is a session for that
 * person, the same one on every device. Nothing the browser says about who it is is trusted
 * here, only what the adapter confirms.
 */
export async function POST(request: Request): Promise<Response> {
  const input = identifyInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));

  let identity: VerifiedIdentity | null;
  try {
    identity = await verifyIdentity(input.data.token);
  } catch (error) {
    if (!(error instanceof IdentityError) || error.reason === "unavailable") throw error;
    return apiError(error.reason === "expired" ? "token_expired" : "token_rejected", error.message);
  }
  if (!identity) return apiError("forbidden", "This install does not identify its users.");

  const session = await sessionForUser(identity.externalId);
  const { error } = await supabaseAdmin.rpc("identify_contact", {
    contact_id: session.userId,
    external_id: identity.externalId,
    attributes: identity.attributes,
    ...(identity.name === undefined ? {} : { name: identity.name }),
    ...(identity.email === undefined ? {} : { email: identity.email }),
    ...(identity.audience === undefined ? {} : { audience: identity.audience }),
    ...(identity.org === undefined ? {} : { org_id: identity.org.id }),
    ...(identity.org?.name === undefined ? {} : { org_name: identity.org.name }),
  });
  if (error) throw error;

  return Response.json(session satisfies IdentifyResponse, {
    headers: { "cache-control": "no-store" },
  });
}

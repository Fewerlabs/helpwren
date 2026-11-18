import { IdentityError, type VerifiedIdentity } from "@helpwren/adapters";
import { identifyInputSchema, type IdentifyResponse } from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { apiError } from "@/lib/api/respond";
import { verifyIdentity } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionForUser } from "@/lib/supabase/user-session";

/** Gives a guest's conversations to the user they turned out to be. Returns how many moved. */
async function mergeGuest(guestId: string, userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("merge_guest_into_user", {
    guest_id: guestId,
    user_id: userId,
  });
  if (error) throw error;

  // The guest has nothing left, so their sign-in goes too. If this fails they stay behind as
  // an empty guest, which costs nothing and is no reason to fail a sign-in that has worked.
  await supabaseAdmin.auth.admin.deleteUser(guestId);
  return data;
}

/**
 * Signs the chat in as one of the host product's users. The page hands over a token; the
 * install's identity adapter confirms who it belongs to; and the answer is a session for that
 * person, the same one on every device. Nothing the browser says about who it is is trusted
 * here, only what the adapter confirms.
 *
 * A visitor who was chatting as a guest sends that session along, and what they did as a guest
 * becomes the user's. The session is the proof that those conversations are theirs to bring.
 */
export async function POST(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  // A session that was sent but could not be verified is said so, not passed over: the chat
  // can renew it and ask again, where carrying on would leave the guest's conversations behind.
  if (!caller && request.headers.has("authorization")) {
    return apiError("unauthorized", "The session sent with this request is not valid.");
  }

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

  const mergedConversations = caller?.isGuest ? await mergeGuest(caller.id, session.userId) : 0;

  return Response.json({ ...session, mergedConversations } satisfies IdentifyResponse, {
    headers: { "cache-control": "no-store" },
  });
}

import { IdentityError } from "@helpwren/adapters";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { apiError } from "@/lib/api/respond";
import { verifyIdentity } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";

const inputSchema = z.object({
  /** The user's token for the host product, as `identify` takes it. */
  token: z.string().min(1).max(8000).optional(),
});

async function countFor(contactId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("unread_for_contact")
    .eq("contact_id", contactId)
    .gt("unread_for_contact", 0);
  if (error) throw error;
  return data.reduce((total, row) => total + row.unread_for_contact, 0);
}

/** The contact the host product knows by this id, or `null` if they have never written. */
async function contactFor(externalId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("external_id", externalId)
    .eq("verified", true)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/**
 * How many replies a person has not read, for a badge outside the chat: on an app's icon, or a
 * help button. An app sends the token it has for its user, as it would to `identify`, so it
 * needs no Helpwren session of its own; the chat frame and other clients may send their
 * Helpwren session instead. Call it when the app comes to the front, not on a timer: with a
 * profile endpoint, each call asks the host product who the token belongs to.
 */
export async function POST(request: Request): Promise<Response> {
  const input = inputSchema.safeParse(await request.json().catch(() => ({})));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));
  const respond = (count: number) =>
    Response.json({ count }, { headers: { "cache-control": "no-store" } });

  if (!input.data.token) {
    const caller = await getCaller(request);
    if (!caller) return apiError("unauthorized", "Send a token or a session.");
    if (caller.isAgent) return apiError("forbidden", "Team members have no unread replies here.");
    return respond(await countFor(caller.id));
  }

  try {
    const identity = await verifyIdentity(input.data.token);
    if (!identity) return apiError("forbidden", "This install does not identify its users.");
    const contactId = await contactFor(identity.externalId);
    return respond(contactId ? await countFor(contactId) : 0);
  } catch (error) {
    if (!(error instanceof IdentityError)) throw error;
    const codes = {
      expired: "token_expired",
      rejected: "token_rejected",
      unavailable: "identity_unavailable",
    } as const;
    return apiError(codes[error.reason], error.message);
  }
}

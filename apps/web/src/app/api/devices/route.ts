import { IdentityError, isExpoPushToken, isFcmToken } from "@helpwren/adapters";
import { parseSettings } from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { verifyIdentity } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** A push token, checked against the service it is for. */
function validToken(provider: "expo" | "fcm", token: string): boolean {
  return provider === "expo" ? isExpoPushToken(token) : isFcmToken(token);
}

const providerSchema = z.enum(["expo", "fcm"]).default("expo");

const registerSchema = z
  .object({
    /** The push service's address for this app on this phone. */
    pushToken: z.string().min(1).max(4096),
    /** Which service the token is for: Expo's (the default) or Firebase's. */
    provider: providerSchema,
    platform: z.enum(["ios", "android"]),
    /** Which of the install's sources the app is. */
    app: z.string().trim().min(1).max(40),
    /** The user's token for the host product. Without it, the caller's Helpwren session. */
    token: z.string().min(1).max(8000).optional(),
  })
  .refine((input) => validToken(input.provider, input.pushToken), {
    message: "The push token is not one for that service.",
    path: ["pushToken"],
  });

const removeSchema = z.object({ pushToken: z.string().min(1).max(4096) });

const identityCodes = {
  expired: "token_expired",
  rejected: "token_rejected",
  unavailable: "identity_unavailable",
} as const;

/**
 * Registers a phone for pushes about replies. An app registers its logged-in user at start with
 * the token it has for them, before they ever open the chat; the chat frame, or an app with a
 * guest, registers with its Helpwren session. A phone that registers again moves to whoever it
 * registers for now.
 */
export async function POST(request: Request): Promise<Response> {
  const limited = await checkLimits([[LIMITS.devicesPerNetwork, requestNetwork(request).key]]);
  if (limited) return limited;

  const input = registerSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));
  const { pushToken, provider, platform, app, token } = input.data;

  const { data: settingRows, error: settingsError } = await supabaseAdmin
    .from("settings")
    .select("key, value");
  if (settingsError) throw settingsError;
  if (!parseSettings(settingRows).sources.includes(app)) {
    return apiError("invalid_request", `"${app}" is not one of this install's sources.`);
  }

  let owner: { contact_id: string | null; external_id: string | null };
  if (token) {
    try {
      const identity = await verifyIdentity(token);
      if (!identity) return apiError("forbidden", "This install does not identify its users.");
      owner = { contact_id: null, external_id: identity.externalId };
    } catch (error) {
      if (!(error instanceof IdentityError)) throw error;
      return apiError(identityCodes[error.reason], error.message);
    }
  } else {
    const caller = await getCaller(request);
    if (!caller) return apiError("unauthorized", "Send a token or a session.");
    if (caller.isAgent) return apiError("forbidden", "Team members are not notified here.");
    const { data: contact, error } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("id", caller.id)
      .maybeSingle();
    if (error) throw error;
    // A guest who has never written has nothing to be told about yet.
    if (!contact) return apiError("not_found", "Write first, then register for replies.");
    owner = { contact_id: contact.id, external_id: null };
  }

  const { error } = await supabaseAdmin
    .from("devices")
    .upsert(
      { push_token: pushToken, provider, platform, app, ...owner },
      { onConflict: "push_token" },
    );
  if (error) throw error;
  return new Response(null, { status: 204 });
}

/**
 * Stops pushes to a phone, for when its user logs out. The push token is enough: it is known
 * only to the app on that phone, and removing it only stops notifications.
 */
export async function DELETE(request: Request): Promise<Response> {
  const limited = await checkLimits([[LIMITS.devicesPerNetwork, requestNetwork(request).key]]);
  if (limited) return limited;

  const input = removeSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));

  const { error } = await supabaseAdmin
    .from("devices")
    .delete()
    .eq("push_token", input.data.pushToken);
  if (error) throw error;
  return new Response(null, { status: 204 });
}

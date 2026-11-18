import {
  hasRequiredGuestDetails,
  parseSettings,
  RATE_LIMITED_SQLSTATE,
  startConversationInputSchema,
} from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { apiError } from "@/lib/api/respond";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Starts a conversation with its first message. The server creates it, not the browser, so
 * that who it belongs to cannot be forged and the install's rules are applied.
 */
export async function POST(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return apiError("unauthorized", "Start a session before starting a conversation.");
  if (caller.isAgent) return apiError("forbidden", "Team members cannot start a conversation.");

  const input = startConversationInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));
  const { message, source, contact, page } = input.data;

  const [settingRows, known] = await Promise.all([
    supabaseAdmin.from("settings").select("key, value"),
    supabaseAdmin.from("contacts").select("name, email, phone").eq("id", caller.id).maybeSingle(),
  ]);
  if (settingRows.error) throw settingRows.error;
  if (known.error) throw known.error;
  const settings = parseSettings(settingRows.data);

  if (!settings.sources.includes(source)) {
    return apiError("invalid_request", `"${source}" is not one of this install's sources.`);
  }
  // Someone who gave their details in an earlier conversation is not asked again.
  if (!hasRequiredGuestDetails(settings.guestDetails, { ...known.data, ...contact })) {
    return apiError("details_required", "Contact details are needed before the first message.");
  }

  const { data: conversationId, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: caller.id,
    body: message,
    source,
    context: {
      ...page,
      ...(request.headers.has("user-agent")
        ? { userAgent: request.headers.get("user-agent") }
        : {}),
    },
    ...(contact.name === undefined ? {} : { contact_name: contact.name }),
    ...(contact.email === undefined ? {} : { contact_email: contact.email }),
    ...(contact.phone === undefined ? {} : { contact_phone: contact.phone }),
  });

  if (error) {
    if (error.code === RATE_LIMITED_SQLSTATE) return apiError("rate_limited", error.message);
    throw error;
  }
  return Response.json({ conversationId }, { status: 201 });
}

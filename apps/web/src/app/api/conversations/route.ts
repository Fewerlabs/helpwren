import {
  hasRequiredGuestDetails,
  parseSettings,
  RATE_LIMITED_SQLSTATE,
  startConversationInputSchema,
} from "@helpwren/core";
import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { installCaptcha } from "@/lib/api/captcha";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { botReason } from "@/lib/api/spam";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** The database's codes for a message refused as spam, and for a blocked contact or network. */
const REFUSED_SQLSTATE = "HW422";
const BLOCKED_SQLSTATE = "HW403";

/**
 * Starts a conversation with its first message. The server creates it, not the browser, so
 * that who it belongs to cannot be forged and the install's rules are applied.
 */
export async function POST(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return apiError("unauthorized", "Start a session before starting a conversation.");
  if (caller.isAgent) return apiError("forbidden", "Team members cannot start a conversation.");

  const network = requestNetwork(request);
  const limited = await checkLimits([
    [LIMITS.startPerNetwork, network.key],
    [LIMITS.startPerSession, caller.id],
  ]);
  if (limited) return limited;

  const input = startConversationInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));
  const { message, source, contact, page, ticket, context, visitorId } = input.data;

  // Told apart from a person's mistakes only in the server's log: a bot learns nothing from
  // the answer that would help it next time.
  const bot = botReason(input.data);
  if (bot) {
    console.warn(`Refused a conversation as sent by a bot: ${bot}`);
    return apiError("refused", "Your message could not be sent.");
  }

  const [settingRows, known] = await Promise.all([
    supabaseAdmin.from("settings").select("key, value"),
    supabaseAdmin
      .from("contacts")
      .select("name, email, phone, verified")
      .eq("id", caller.id)
      .maybeSingle(),
  ]);
  if (settingRows.error) throw settingRows.error;
  if (known.error) throw known.error;
  const settings = parseSettings(settingRows.data);

  // The host product vouches for a verified user, so only guests answer the captcha.
  const captcha = known.data?.verified ? null : installCaptcha(settings);
  if (
    captcha &&
    !(await captcha.verify(input.data.captchaToken ?? "", network.address ?? undefined))
  ) {
    return apiError("refused", "Answer the check that you are a person, then send again.");
  }

  if (!settings.sources.includes(source)) {
    return apiError("invalid_request", `"${source}" is not one of this install's sources.`);
  }
  if (ticket && !settings.tickets.fromChat) {
    return apiError("invalid_request", "This install does not take tickets from the chat.");
  }
  // Someone who gave their details in an earlier conversation is not asked again.
  // Nor is someone the host product has vouched for: it has said who they are.
  if (
    !known.data?.verified &&
    !hasRequiredGuestDetails(settings.guestDetails, { ...known.data, ...contact })
  ) {
    return apiError("details_required", "Contact details are needed before the first message.");
  }

  const { data: conversationId, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: caller.id,
    body: message,
    source,
    context: {
      ...page,
      // Kept apart from what the server knows, because the page could have said anything.
      ...(context && Object.keys(context).length > 0 ? { custom: context } : {}),
      ...(request.headers.has("user-agent")
        ? { userAgent: request.headers.get("user-agent") }
        : {}),
    },
    ...(contact.name === undefined ? {} : { contact_name: contact.name }),
    ...(contact.email === undefined ? {} : { contact_email: contact.email }),
    ...(contact.phone === undefined ? {} : { contact_phone: contact.phone }),
    ...(ticket ? { ticket_subject: ticket.subject } : {}),
    ...(network.key ? { network_key: network.key } : {}),
  });

  if (error) {
    if (error.code === RATE_LIMITED_SQLSTATE) return apiError("rate_limited", error.message);
    if (error.code === REFUSED_SQLSTATE || error.code === BLOCKED_SQLSTATE) {
      return apiError("refused", error.message);
    }
    throw error;
  }

  // The browser they wrote from is theirs now, and the team sees its details on the contact.
  if (visitorId && settings.visitors.tracking) {
    const linked = await supabaseAdmin.rpc("link_visitor", {
      visitor_id: visitorId,
      contact_id: caller.id,
    });
    if (linked.error) throw linked.error;
  }
  return Response.json({ conversationId }, { status: 201 });
}

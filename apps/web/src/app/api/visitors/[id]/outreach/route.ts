import { outreachInputSchema, visitorIdSchema } from "@helpwren/core";
import { z } from "zod";

import { getCaller, type Caller } from "@/lib/api/caller";
import { installSettings } from "@/lib/api/install-settings";
import { apiError } from "@/lib/api/respond";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Context = RouteContext<"/api/visitors/[id]/outreach">;

/**
 * Who may change a visitor's waiting message, and which visitor: a team member, while the
 * install keeps track of visitors and lists them live. Returns a response when they may not.
 */
async function check(
  request: Request,
  params: Context["params"],
): Promise<{ caller: Caller; visitorId: string } | Response> {
  const caller = await getCaller(request);
  if (!caller) return apiError("unauthorized", "Sign in to write to a visitor.");
  if (!caller.isAgent) return apiError("forbidden", "Only the team writes to visitors.");

  const settings = await installSettings();
  if (!settings.visitors.tracking || !settings.visitors.liveList) {
    return apiError("disabled", "Starting conversations with visitors is switched off.");
  }

  const id = visitorIdSchema.safeParse((await params).id);
  if (!id.success) return apiError("not_found", "No such visitor.");
  return { caller, visitorId: id.data };
}

/**
 * Leaves a first message for a visitor. Their browser takes it up the next time it checks in,
 * which turns it into a conversation. A message already waiting is replaced.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const allowed = await check(request, params);
  if (allowed instanceof Response) return allowed;

  const input = outreachInputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError("invalid_request", z.prettifyError(input.error));

  const { data, error } = await supabaseAdmin
    .from("visitors")
    .update({
      pending_message: input.data.message,
      pending_agent_id: allowed.caller.id,
      pending_at: new Date().toISOString(),
      outreach_conversation_id: null,
    })
    .eq("id", allowed.visitorId)
    .select("id");
  if (error) throw error;
  if (data.length === 0) return apiError("not_found", "No such visitor.");

  return Response.json({ ok: true });
}

/** Takes back a message the visitor's browser has not taken up yet. */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const allowed = await check(request, params);
  if (allowed instanceof Response) return allowed;

  const { data, error } = await supabaseAdmin
    .from("visitors")
    .update({ pending_message: null, pending_agent_id: null, pending_at: null })
    .eq("id", allowed.visitorId)
    .select("id");
  if (error) throw error;
  if (data.length === 0) return apiError("not_found", "No such visitor.");

  return Response.json({ ok: true });
}

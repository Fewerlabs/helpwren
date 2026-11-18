import { z } from "zod";

import { getCaller } from "@/lib/api/caller";
import { apiError } from "@/lib/api/respond";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Marks a conversation as read for the caller's side: the contact's count for its owner, the
 * team's count for an agent. A contact cannot update a conversation themselves, so this goes
 * through the server.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/conversations/[id]/read">,
): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return apiError("unauthorized", "Sign in to mark a conversation as read.");

  const id = z.uuid().safeParse((await params).id);
  // The same answer for "no such conversation" and "not yours", so ids cannot be probed.
  const notFound = apiError("not_found", "No such conversation.");
  if (!id.success) return notFound;

  const update = caller.isAgent
    ? supabaseAdmin.from("conversations").update({ unread_for_agents: 0 }).eq("id", id.data)
    : supabaseAdmin
        .from("conversations")
        .update({ unread_for_contact: 0 })
        .eq("id", id.data)
        .eq("contact_id", caller.id);

  const { data, error } = await update.select("id");
  if (error) throw error;
  if (data.length === 0) return notFound;

  return new Response(null, { status: 204 });
}

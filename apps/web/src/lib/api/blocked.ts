import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Whether the team has blocked this contact, or the network they last wrote from. The
 * database refuses their messages itself; this is for what reaches storage through the app.
 */
export async function isBlocked(contactId: string): Promise<boolean> {
  const { data: contact, error } = await supabaseAdmin
    .from("contacts")
    .select("blocked_at, network_key")
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw error;
  if (!contact) return false;
  if (contact.blocked_at) return true;
  if (!contact.network_key) return false;

  const { count, error: networkError } = await supabaseAdmin
    .from("blocked_networks")
    .select("key", { count: "exact", head: true })
    .eq("key", contact.network_key);
  if (networkError) throw networkError;
  return (count ?? 0) > 0;
}

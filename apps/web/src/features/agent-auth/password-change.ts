import "server-only";

import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Set in a team member's `app_metadata` when an admin gives them a temporary password, so they
 * choose their own at their first sign-in. Only the server can write `app_metadata`.
 */
export const MUST_CHANGE_PASSWORD = "must_change_password";

/** Whether the signed-in team member still has to replace a temporary password. */
export const mustChangePassword = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.app_metadata?.[MUST_CHANGE_PASSWORD] === true;
});

/**
 * After the signed-in team member chose their own password: no longer asks them to, and gives
 * them a fresh session, whose token no longer carries the old mark.
 */
export async function finishPasswordChange(agentId: string): Promise<void> {
  if (!(await mustChangePassword())) return;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(agentId, {
    app_metadata: { [MUST_CHANGE_PASSWORD]: false },
  });
  if (error) throw error;
  const supabase = await createSupabaseServerClient();
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error) throw refreshed.error;
}

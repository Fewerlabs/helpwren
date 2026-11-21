"use server";

import { HelpwrenError } from "@helpwren/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DASHBOARD_PATH, MUST_CHANGE_PASSWORD } from "@/features/agent-auth";
import { LIMITS } from "@/lib/api/limits";
import { networkFromHeaders, withinLimits } from "@/lib/api/rate-limit";
import { getHelpwren } from "@/lib/helpwren";
import { passwordTwiceSchema, type PasswordTwiceValues } from "@/lib/password-schema";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { claimInvite, releaseInvite, revokeInvites } from "./server";

export interface AcceptInviteResult {
  ok: false;
  reason: "expired" | "invalid" | "weak" | "rate_limited" | "failed";
}

/**
 * Sets the first password of the person an invite link is for, uses the link up, signs them in
 * and sends them to the dashboard. Returns only when it did not work.
 */
export async function acceptInvite(
  token: string,
  values: PasswordTwiceValues,
): Promise<AcceptInviteResult> {
  const parsed = passwordTwiceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { password } = parsed.data;

  const network = networkFromHeaders(await headers());
  if (!(await withinLimits([[LIMITS.acceptInvitePerNetwork, network.key]]))) {
    return { ok: false, reason: "rate_limited" };
  }

  const agentId = await claimInvite(token);
  if (!agentId) return { ok: false, reason: "expired" };

  const updated = await supabaseAdmin.auth.admin.updateUserById(agentId, {
    password,
    // A temporary password given before is replaced by this one, so nothing is left to change.
    app_metadata: { [MUST_CHANGE_PASSWORD]: false },
  });
  if (updated.error) {
    await releaseInvite(token);
    if (updated.error.code === "weak_password") return { ok: false, reason: "weak" };
    throw updated.error;
  }
  await revokeInvites(agentId);

  const email = updated.data.user.email;
  if (!email) return { ok: false, reason: "failed" };
  let signedIn;
  try {
    const helpwren = await getHelpwren();
    signedIn = await helpwren.auth.signInWithPassword(email, password);
  } catch (error) {
    if (error instanceof HelpwrenError) return { ok: false, reason: "failed" };
    throw error;
  }
  if (!signedIn.ok) return { ok: false, reason: "failed" };
  redirect(DASHBOARD_PATH);
}

import "server-only";

import { type Agent } from "@helpwren/core";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type InviteValues, type MemberChange } from "../schemas";

export type InviteResult = { ok: true } | { ok: false; reason: "forbidden" | "already_member" };

export type ChangeMemberResult =
  { ok: true } | { ok: false; reason: "forbidden" | "self" | "last_admin" | "not_found" };

/** The database's error code when a change would leave the team with no active admin. */
const NO_ADMIN_LEFT = "HW409";

async function findOrCreateUser(email: string): Promise<string> {
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (!created.error) return created.data.user.id;
  if (created.error.code !== "email_exists") throw created.error;

  // There is no lookup by email, so page through the accounts to find the one that exists.
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length === 0) throw new Error(`An account for ${email} could not be found.`);
  }
}

/**
 * Adds someone to the team. They can sign in at once, with a code sent to their email. The
 * team table has no rules that let the browser write to it, so this runs on the server with
 * the secret key, after checking that the caller is an admin.
 */
export async function inviteTeamMember(caller: Agent, invite: InviteValues): Promise<InviteResult> {
  if (caller.role !== "admin") return { ok: false, reason: "forbidden" };

  const userId = await findOrCreateUser(invite.email);
  const { error } = await supabaseAdmin
    .from("agents")
    .insert({ user_id: userId, name: invite.name, email: invite.email, role: invite.role });

  if (error) {
    // 23505: this person is already on the team, active or not.
    if (error.code === "23505") return { ok: false, reason: "already_member" };
    throw error;
  }
  return { ok: true };
}

/** Changes a team member's role, or deactivates or reactivates them. Admins only, never oneself. */
export async function changeTeamMember(
  caller: Agent,
  id: string,
  change: MemberChange,
): Promise<ChangeMemberResult> {
  if (caller.role !== "admin") return { ok: false, reason: "forbidden" };
  // Changing yourself is how an admin locks themselves out by accident.
  if (caller.id === id) return { ok: false, reason: "self" };

  const { data, error } = await supabaseAdmin
    .from("agents")
    .update(change)
    .eq("user_id", id)
    .select("user_id");

  if (error) {
    if (error.code === NO_ADMIN_LEFT) return { ok: false, reason: "last_admin" };
    throw error;
  }
  return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
}

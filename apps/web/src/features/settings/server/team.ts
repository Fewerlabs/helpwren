import "server-only";

import { type Agent } from "@helpwren/core";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { type MemberChange, type ProfileValues } from "../schemas";

export type ChangeMemberResult =
  { ok: true } | { ok: false; reason: "forbidden" | "self" | "last_admin" | "not_found" };

/** The database's error code when a change would leave the team with no active admin. */
const NO_ADMIN_LEFT = "HW409";

export type SetPasswordResult =
  { ok: true } | { ok: false; reason: "forbidden" | "self" | "not_found" };

/**
 * Sets a team member's password, for someone who has none or has forgotten theirs. Admins
 * only, and never their own, which they change under Profile where it is typed twice.
 */
export async function setMemberPassword(
  caller: Agent,
  id: string,
  password: string,
): Promise<SetPasswordResult> {
  if (caller.role !== "admin") return { ok: false, reason: "forbidden" };
  if (caller.id === id) return { ok: false, reason: "self" };

  // Only someone on the team: the id must not reach any other account.
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select("user_id")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: "not_found" };

  const updated = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (updated.error) throw updated.error;
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

/**
 * Changes a team member's own name and photo. Their row is found by who is signed in and never
 * by an id from the browser, so nobody changes anyone else. A photo must be one they uploaded
 * themselves: an address in their own folder of the photos bucket. False if it is not.
 */
export async function updateOwnProfile(caller: Agent, profile: ProfileValues): Promise<boolean> {
  const ownPhotos = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${caller.id}/`;
  if (profile.photo && !profile.photo.startsWith(ownPhotos)) return false;

  const { error } = await supabaseAdmin
    .from("agents")
    .update({ name: profile.name, photo: profile.photo || null })
    .eq("user_id", caller.id);
  if (error) throw error;
  return true;
}

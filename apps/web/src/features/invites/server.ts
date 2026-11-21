import "server-only";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { createInviteToken, hashInviteToken, isInviteToken } from "./token";

/** Where an invite link opens. */
export const INVITE_PATH = "/invite";

/** The full address of an invite link, for an email or for the admin to copy. */
export function inviteUrl(token: string): string {
  return new URL(`${INVITE_PATH}/${token}`, env.NEXT_PUBLIC_APP_URL).toString();
}

/**
 * Makes a new invite link for a team member and returns its address. Any earlier link they
 * have not used stops working, so only the newest one is ever out there.
 */
export async function issueInvite(agentId: string, createdBy: string): Promise<string> {
  await revokeInvites(agentId);
  const { token, hash } = createInviteToken();
  const { error } = await supabaseAdmin
    .from("agent_invites")
    .insert({ agent_id: agentId, token_hash: hash, created_by: createdBy });
  if (error) throw error;
  return inviteUrl(token);
}

/** Who an invite link is for, while it can still be used. */
export interface OpenInvite {
  agentId: string;
  name: string;
  email: string;
}

/**
 * The invite a link stands for, or `null` when it is unknown, used, out of date, or for someone
 * no longer active. All four look the same to the person holding the link.
 */
export async function findOpenInvite(token: string): Promise<OpenInvite | null> {
  if (!isInviteToken(token)) return null;
  const { data, error } = await supabaseAdmin
    .from("agent_invites")
    .select("agent_id, agents!agent_invites_agent_id_fkey(name, email, active)")
    .eq("token_hash", hashInviteToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data?.agents.active) return null;
  return { agentId: data.agent_id, name: data.agents.name, email: data.agents.email };
}

/**
 * Uses up an invite link, once: two tries at the same moment cannot both succeed. Returns whose
 * it was, or `null` when it could not be used.
 */
export async function claimInvite(token: string): Promise<string | null> {
  if (!isInviteToken(token)) return null;
  const { data, error } = await supabaseAdmin
    .from("agent_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashInviteToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("agent_id")
    .maybeSingle();
  if (error) throw error;
  return data?.agent_id ?? null;
}

/** Puts a claimed link back, when setting the password it was claimed for did not work. */
export async function releaseInvite(token: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("agent_invites")
    .update({ used_at: null })
    .eq("token_hash", hashInviteToken(token));
  if (error) throw error;
}

/** Ends the links a team member has not used, such as after they joined another way. */
export async function revokeInvites(agentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("agent_invites")
    .delete()
    .eq("agent_id", agentId)
    .is("used_at", null);
  if (error) throw error;
}

/** The team members who have never signed in, whom the team list shows as invited. */
export async function listInvitedMembers(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.rpc("agent_sign_ins");
  if (error) throw error;
  // Supabase Auth leaves the time empty until the first sign-in, which the generated type
  // does not show.
  return data
    .filter((row) => (row.last_sign_in_at as string | null) === null)
    .map((row) => row.user_id);
}

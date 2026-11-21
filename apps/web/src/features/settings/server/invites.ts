import "server-only";

import { type Agent } from "@helpwren/core";

import { MUST_CHANGE_PASSWORD } from "@/features/agent-auth";
import {
  generateTemporaryPassword,
  INVITE_LIFETIME_DAYS,
  issueInvite,
  revokeInvites,
} from "@/features/invites";
import { installSettings } from "@/lib/api/install-settings";
import { LIMITS } from "@/lib/api/limits";
import { withinLimits } from "@/lib/api/rate-limit";
import { getEmail, sendEmail } from "@/lib/email";
import { buildInviteEmail } from "@/lib/email/templates";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { type InviteMethod, type InviteValues } from "../schemas";

/** How the person was given a way in, for the dialog to show the admin. */
export type InviteDelivery =
  | { kind: "emailed" }
  /** A link to pass on: the one asked for, or the one an email could not carry. */
  | { kind: "link"; link: string; emailFailed: boolean; days: number }
  /** A temporary password, shown to the admin this once. */
  | { kind: "password"; password: string };

export type InviteFailure =
  "forbidden" | "already_member" | "self" | "not_found" | "email_unavailable" | "rate_limited";

export type InviteResult =
  { ok: true; delivery: InviteDelivery } | { ok: false; reason: InviteFailure };

interface Member {
  id: string;
  email: string;
}

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
 * Whether an invite by email can go: email must be set up, and each admin sends only so many an
 * hour. Checked before anything is changed.
 */
async function canEmail(caller: Agent): Promise<InviteFailure | null> {
  if ((await getEmail()).adapter === null) return "email_unavailable";
  if (!(await withinLimits([[LIMITS.inviteEmailPerAdmin, caller.id]]))) return "rate_limited";
  return null;
}

/** Gives a team member a way in: an emailed link, a link to pass on, or a temporary password. */
async function deliver(
  caller: Agent,
  member: Member,
  method: InviteMethod,
): Promise<InviteDelivery> {
  if (method === "password") {
    const password = generateTemporaryPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(member.id, {
      password,
      app_metadata: { [MUST_CHANGE_PASSWORD]: true },
    });
    if (error) throw error;
    // One way in at a time: a link sent earlier stops working.
    await revokeInvites(member.id);
    return { kind: "password", password };
  }

  const link = await issueInvite(member.id, caller.id);
  const handed = { kind: "link", link, days: INVITE_LIFETIME_DAYS } as const;
  if (method === "link") return { ...handed, emailFailed: false };

  const { brand } = await installSettings();
  const sent = await sendEmail({
    to: member.email,
    ...buildInviteEmail({ brand, inviter: caller.name, url: link, days: INVITE_LIFETIME_DAYS }),
  });
  return sent.ok ? { kind: "emailed" } : { ...handed, emailFailed: true };
}

/**
 * Adds someone to the team, and gives them a way in as the admin chose. The team table has no
 * rules that let the browser write to it, so this runs on the server with the secret key, after
 * checking that the caller is an admin.
 */
export async function inviteTeamMember(caller: Agent, invite: InviteValues): Promise<InviteResult> {
  if (caller.role !== "admin") return { ok: false, reason: "forbidden" };
  if (invite.method === "email") {
    const problem = await canEmail(caller);
    if (problem) return { ok: false, reason: problem };
  }

  const id = await findOrCreateUser(invite.email);
  const { error } = await supabaseAdmin
    .from("agents")
    .insert({ user_id: id, name: invite.name, email: invite.email, role: invite.role });
  if (error) {
    // 23505: this person is already on the team, active or not.
    if (error.code === "23505") return { ok: false, reason: "already_member" };
    throw error;
  }
  return { ok: true, delivery: await deliver(caller, { id, email: invite.email }, invite.method) };
}

/**
 * A new invite for someone already added: emailed again, or a link to copy. Either way the link
 * they had stops working. Admins only, for active members other than themselves.
 */
export async function reinviteTeamMember(
  caller: Agent,
  id: string,
  method: Exclude<InviteMethod, "password">,
): Promise<InviteResult> {
  if (caller.role !== "admin") return { ok: false, reason: "forbidden" };
  if (caller.id === id) return { ok: false, reason: "self" };

  const { data, error } = await supabaseAdmin
    .from("agents")
    .select("email")
    .eq("user_id", id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: "not_found" };

  if (method === "email") {
    const problem = await canEmail(caller);
    if (problem) return { ok: false, reason: problem };
  }
  return { ok: true, delivery: await deliver(caller, { id, email: data.email }, method) };
}

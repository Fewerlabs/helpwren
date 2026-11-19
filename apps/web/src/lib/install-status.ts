import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** Where the widget has been seen. Origins are as the browser sent them, never trusted. */
export interface WidgetSighting {
  firstOrigin: string;
  firstSeenAt: string;
  lastOrigin: string;
  lastSeenAt: string;
}

export interface InstallStatus {
  /** When the first admin finished or skipped the setup wizard, or `null` while it is open. */
  setupCompletedAt: string | null;
  widget: WidgetSighting | null;
}

/** Whether anyone is on the team at all, active or not. A new install has nobody. */
export async function hasTeam(): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from("agents")
    .select("user_id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getInstallStatus(): Promise<InstallStatus> {
  const { data, error } = await supabaseAdmin.from("install_status").select().maybeSingle();
  if (error) throw error;
  const widget =
    data?.widget_first_seen_origin &&
    data.widget_first_seen_at &&
    data.widget_last_seen_origin &&
    data.widget_last_seen_at
      ? {
          firstOrigin: data.widget_first_seen_origin,
          firstSeenAt: data.widget_first_seen_at,
          lastOrigin: data.widget_last_seen_origin,
          lastSeenAt: data.widget_last_seen_at,
        }
      : null;
  return { setupCompletedAt: data?.setup_completed_at ?? null, widget };
}

/** Closes the setup wizard for good: `/setup` sends everyone to the dashboard after this. */
export async function markSetupDone(): Promise<void> {
  const { error } = await supabaseAdmin
    .from("install_status")
    .update({ setup_completed_at: new Date().toISOString() })
    .eq("id", true)
    .is("setup_completed_at", null);
  if (error) throw error;
}

/** Notes the widget loading on a site. The database writes at most once a minute per site. */
export async function recordWidgetSeen(origin: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("record_widget_seen", { origin });
  if (error) throw error;
}

/** Finds an account by email. Supabase Auth has no lookup by email, so this pages through. */
async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

export type FirstAdminResult = "created" | "taken";

/**
 * Makes the install's first admin, only while nobody is on the team. The database decides,
 * under a lock (`create_first_admin`), so two people setting up at the same moment cannot both
 * win; the one who loses gets "taken", and any account made for them is removed again.
 */
export async function createFirstAdmin(name: string, email: string): Promise<FirstAdminResult> {
  // Refuse before making an account, so a set-up install never gains one through here.
  if (await hasTeam()) return "taken";

  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  let userId: string | null;
  let madeNow = false;
  if (!created.error) {
    userId = created.data.user.id;
    madeNow = true;
  } else if (created.error.code === "email_exists") {
    userId = await findUserId(email);
  } else {
    throw created.error;
  }
  if (!userId) throw new Error(`An account for ${email} exists but could not be found.`);

  const { data: won, error } = await supabaseAdmin.rpc("create_first_admin", {
    user_id: userId,
    name,
    email,
  });
  if (error || !won) {
    if (madeNow) await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return "taken";
  }
  return "created";
}

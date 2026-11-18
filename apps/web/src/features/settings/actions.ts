"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { getHelpwren } from "@/lib/helpwren";

import {
  brandingSchema,
  brandingToSettings,
  generalSchema,
  installationSchema,
  inviteSchema,
  memberChangeSchema,
  profileSchema,
  type BrandingValues,
  type GeneralValues,
  type InstallationValues,
  type InviteValues,
  type MemberChange,
  type ProfileValues,
} from "./schemas";
import {
  changeTeamMember,
  inviteTeamMember,
  updateOwnProfile,
  type ChangeMemberResult,
  type InviteResult,
} from "./server/team";

export type SaveResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" };

const SETTINGS_PATH = "/dashboard/settings";

/** Saves the general settings. The database refuses anyone who is not an admin. */
export async function saveGeneral(values: GeneralValues): Promise<SaveResult> {
  const parsed = generalSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update({ guestDetails: parsed.data.guestDetails });
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

/** Saves the brand, and how the widget, the chat page and the help center wear it. */
export async function saveBranding(values: BrandingValues): Promise<SaveResult> {
  const parsed = brandingSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update(brandingToSettings(parsed.data));
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

/** Changes the signed-in team member's own name and photo. */
export async function saveProfile(values: ProfileValues): Promise<SaveResult> {
  const caller = await getCurrentAgent();
  if (!caller) return { ok: false, reason: "forbidden" };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const saved = await updateOwnProfile(caller, parsed.data);
  if (!saved) return { ok: false, reason: "invalid" };
  // The name is in the sidebar, on every dashboard page.
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function saveInstallation(values: InstallationValues): Promise<SaveResult> {
  const parsed = installationSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update({ allowedDomains: parsed.data.allowedDomains });
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

export async function inviteMember(
  values: InviteValues,
): Promise<InviteResult | { ok: false; reason: "invalid" }> {
  const caller = await getCurrentAgent();
  if (!caller) return { ok: false, reason: "forbidden" };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const result = await inviteTeamMember(caller, parsed.data);
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

export async function changeMember(id: string, change: MemberChange): Promise<ChangeMemberResult> {
  const caller = await getCurrentAgent();
  if (!caller) return { ok: false, reason: "forbidden" };
  const parsed = memberChangeSchema.safeParse({ id, change });
  if (!parsed.success) return { ok: false, reason: "not_found" };

  const result = await changeTeamMember(caller, parsed.data.id, parsed.data.change);
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

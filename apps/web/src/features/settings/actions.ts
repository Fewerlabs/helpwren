"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { getHelpwren } from "@/lib/helpwren";

import {
  generalSchema,
  installationSchema,
  inviteSchema,
  memberChangeSchema,
  type GeneralValues,
  type InstallationValues,
  type InviteValues,
  type MemberChange,
} from "./schemas";
import {
  changeTeamMember,
  inviteTeamMember,
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
  const result = await helpwren.settings.update({
    brand: { name: parsed.data.brandName },
    guestDetails: parsed.data.guestDetails,
    defaultCountry: parsed.data.defaultCountry,
  });
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
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

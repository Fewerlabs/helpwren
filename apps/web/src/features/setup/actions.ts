"use server";

import { HelpwrenError } from "@helpwren/core";

import { getCurrentAgent } from "@/features/agent-auth";
import { getHelpwren } from "@/lib/helpwren";
import {
  createFirstAdmin,
  getInstallStatus,
  markSetupDone,
  type WidgetSighting,
} from "@/lib/install-status";

import { firstAdminSchema, type FirstAdminValues } from "./schemas";

export type CreateAdminResult =
  { ok: true } | { ok: false; reason: "taken" | "invalid" | "failed" };

/**
 * Makes the first admin of an install that has nobody on its team, with the password they
 * chose, and signs them in. Refused once anyone is on the team: the database decides, so two
 * people setting up at once cannot both become admin.
 */
export async function createAdmin(values: FirstAdminValues): Promise<CreateAdminResult> {
  const parsed = firstAdminSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { name, email, password } = parsed.data;

  const result = await createFirstAdmin(name, email, password);
  if (result === "taken") return { ok: false, reason: "taken" };
  try {
    const helpwren = await getHelpwren();
    const signedIn = await helpwren.auth.signInWithPassword(email, password);
    return signedIn.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch (error) {
    if (error instanceof HelpwrenError) return { ok: false, reason: "failed" };
    throw error;
  }
}

async function isAdmin(): Promise<boolean> {
  const caller = await getCurrentAgent();
  return caller?.role === "admin";
}

/**
 * Closes the wizard, done or skipped. Every step can still be done later in Settings. The page
 * is not refreshed here: it would redirect away before the "Done" step is shown.
 */
export async function finishSetup(): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  await markSetupDone();
  return { ok: true };
}

/** Where the widget has been seen, or `null` while it has not. Admins only. */
export async function getWidgetSighting(): Promise<WidgetSighting | null> {
  if (!(await isAdmin())) return null;
  return (await getInstallStatus()).widget;
}

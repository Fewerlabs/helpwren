"use server";

import { HelpwrenError, loginEmailSchema } from "@helpwren/core";
import { revalidatePath } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { getHelpwren } from "@/lib/helpwren";
import {
  createFirstAdmin,
  getInstallStatus,
  markSetupDone,
  type WidgetSighting,
} from "@/lib/install-status";

import { firstAdminSchema, type FirstAdminValues } from "./schemas";

export type CodeResult = { ok: true } | { ok: false; detail: string };

/**
 * Emails a sign-in code. The setup wizard shows why it failed, unlike the sign-in page: the
 * person setting up is the one who can fix the install's email, and there is no team yet whose
 * membership the answer could give away.
 */
export async function sendSetupCode(email: string): Promise<CodeResult> {
  const parsed = loginEmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, detail: "Enter your email address." };
  try {
    const helpwren = await getHelpwren();
    await helpwren.auth.sendLoginCode(parsed.data);
    return { ok: true };
  } catch (error) {
    if (!(error instanceof HelpwrenError)) throw error;
    // Once set up, this is just another way to ask for a code, and says no more than /login.
    const { setupCompletedAt } = await getInstallStatus();
    const cause = error.cause instanceof Error && !setupCompletedAt ? error.cause.message : "";
    return { ok: false, detail: cause || "Supabase Auth could not send the email." };
  }
}

export type CreateAdminResult =
  { ok: true; code: CodeResult } | { ok: false; reason: "taken" | "invalid" };

/**
 * Makes the first admin of an install that has nobody on its team, then emails them a code to
 * sign in with. Refused once anyone is on the team: the database decides, so two people
 * setting up at once cannot both become admin.
 */
export async function createAdmin(values: FirstAdminValues): Promise<CreateAdminResult> {
  const parsed = firstAdminSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const result = await createFirstAdmin(parsed.data.name, parsed.data.email);
  if (result === "taken") return { ok: false, reason: "taken" };
  return { ok: true, code: await sendSetupCode(parsed.data.email) };
}

export type VerifyCodeResult = { ok: true } | { ok: false; detail: string };

/** Signs the new admin in with the code from their email. */
export async function verifySetupCode(email: string, code: string): Promise<VerifyCodeResult> {
  const parsed = loginEmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, detail: "Enter your email address." };
  try {
    const helpwren = await getHelpwren();
    const result = await helpwren.auth.verifyLoginCode(parsed.data, code);
    if (result.ok) return { ok: true };
    return {
      ok: false,
      detail:
        result.reason === "invalid_code"
          ? "That code is wrong or out of date. Check it, or send a new one."
          : "This email is not the install's admin.",
    };
  } catch (error) {
    if (error instanceof HelpwrenError) {
      return { ok: false, detail: "Something went wrong on our side. Try again in a moment." };
    }
    throw error;
  }
}

async function isAdmin(): Promise<boolean> {
  const caller = await getCurrentAgent();
  return caller?.role === "admin";
}

/** Closes the wizard, done or skipped. Every step can still be done later in Settings. */
export async function finishSetup(): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  await markSetupDone();
  revalidatePath("/setup");
  return { ok: true };
}

/** Where the widget has been seen, or `null` while it has not. Admins only. */
export async function getWidgetSighting(): Promise<WidgetSighting | null> {
  if (!(await isAdmin())) return null;
  return (await getInstallStatus()).widget;
}

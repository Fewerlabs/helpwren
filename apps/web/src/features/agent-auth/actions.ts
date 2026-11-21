"use server";

import { createHmac } from "node:crypto";

import { HelpwrenError, loginEmailSchema } from "@helpwren/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LIMITS } from "@/lib/api/limits";
import { networkFromHeaders, withinLimits } from "@/lib/api/rate-limit";
import { getHelpwren } from "@/lib/helpwren";
import { serverEnv } from "@/lib/server-env";

import { DASHBOARD_PATH, LOGIN_PATH } from "./routes";

export type RequestLoginCodeResult =
  { ok: true } | { ok: false; reason: "invalid_email" | "failed" };

export interface SubmitLoginCodeResult {
  ok: false;
  reason: "invalid_code" | "not_an_agent" | "failed";
}

/** Emails a sign-in code. Succeeds whether or not the email belongs to a team member. */
export async function requestLoginCode(email: string): Promise<RequestLoginCodeResult> {
  const parsed = loginEmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, reason: "invalid_email" };

  try {
    const helpwren = await getHelpwren();
    await helpwren.auth.sendLoginCode(parsed.data);
    return { ok: true };
  } catch (error) {
    if (error instanceof HelpwrenError) return { ok: false, reason: "failed" };
    throw error;
  }
}

/**
 * Where to go once signed in: the dashboard, or back to the setup wizard when sign-in started
 * there. Only these, so the sign-in page cannot be made to send anyone to another site.
 */
function destination(next: string | undefined): string {
  return next === SETUP_PATH ? next : DASHBOARD_PATH;
}

const SETUP_PATH = "/setup";

export interface SubmitPasswordResult {
  ok: false;
  reason: "invalid_credentials" | "not_an_agent" | "rate_limited" | "failed";
}

/**
 * Signs the team member in with their password and sends them on. Returns only when it did
 * not work. Tries are counted per address and per network, so a password cannot be guessed by
 * trying many; the address is kept only as a keyed hash.
 */
export async function submitPassword(
  email: string,
  password: string,
  next?: string,
): Promise<SubmitPasswordResult> {
  const parsed = loginEmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, reason: "invalid_credentials" };

  const network = networkFromHeaders(await headers());
  const emailKey = createHmac("sha256", serverEnv.SUPABASE_SECRET_KEY)
    .update(`email:${parsed.data}`)
    .digest("hex");
  const allowed = await withinLimits([
    [LIMITS.passwordPerEmail, emailKey],
    [LIMITS.passwordPerNetwork, network.key],
  ]);
  if (!allowed) return { ok: false, reason: "rate_limited" };

  let result;
  try {
    const helpwren = await getHelpwren();
    result = await helpwren.auth.signInWithPassword(parsed.data, password);
  } catch (error) {
    if (error instanceof HelpwrenError) return { ok: false, reason: "failed" };
    throw error;
  }

  if (!result.ok) return result;
  redirect(destination(next));
}

/** Signs the team member in and sends them on. Returns only when it did not work. */
export async function submitLoginCode(
  email: string,
  code: string,
  next?: string,
): Promise<SubmitLoginCodeResult> {
  const parsed = loginEmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, reason: "invalid_code" };

  let result;
  try {
    const helpwren = await getHelpwren();
    result = await helpwren.auth.verifyLoginCode(parsed.data, code);
  } catch (error) {
    if (error instanceof HelpwrenError) return { ok: false, reason: "failed" };
    throw error;
  }

  if (!result.ok) return result;
  redirect(destination(next));
}

export async function signOut(): Promise<never> {
  const helpwren = await getHelpwren();
  await helpwren.auth.signOut();
  redirect(LOGIN_PATH);
}

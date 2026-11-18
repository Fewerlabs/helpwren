"use server";

import { HelpwrenError, loginEmailSchema } from "@helpwren/core";
import { redirect } from "next/navigation";

import { getHelpwren } from "@/lib/helpwren";

import { INBOX_PATH, LOGIN_PATH } from "./routes";

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

/** Signs the team member in and sends them to the inbox. Returns only when it did not work. */
export async function submitLoginCode(email: string, code: string): Promise<SubmitLoginCodeResult> {
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
  redirect(INBOX_PATH);
}

export async function signOut(): Promise<never> {
  const helpwren = await getHelpwren();
  await helpwren.auth.signOut();
  redirect(LOGIN_PATH);
}

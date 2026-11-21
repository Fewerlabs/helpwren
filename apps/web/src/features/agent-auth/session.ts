import "server-only";

import { type Agent } from "@helpwren/core";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getHelpwren } from "@/lib/helpwren";

import { mustChangePassword } from "./password-change";
import { CHOOSE_PASSWORD_PATH, LOGIN_PATH } from "./routes";

/** The signed-in team member, or `null`. Looked up once per request however often it is called. */
export const getCurrentAgent = cache(async (): Promise<Agent | null> => {
  const helpwren = await getHelpwren();
  return helpwren.agents.me();
});

/**
 * For pages only team members may see: sends everyone else to the sign-in page, and someone
 * still on a temporary password to choose their own first.
 */
export async function requireAgent(): Promise<Agent> {
  const agent = await getCurrentAgent();
  if (!agent) redirect(LOGIN_PATH);
  if (await mustChangePassword()) redirect(CHOOSE_PASSWORD_PATH);
  return agent;
}

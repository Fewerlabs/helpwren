import "server-only";

import { type Agent } from "@helpwren/core";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getHelpwren } from "@/lib/helpwren";

import { LOGIN_PATH } from "./routes";

/** The signed-in team member, or `null`. Looked up once per request however often it is called. */
export const getCurrentAgent = cache(async (): Promise<Agent | null> => {
  const helpwren = await getHelpwren();
  return helpwren.agents.me();
});

/** For pages only team members may see: sends everyone else to the sign-in page. */
export async function requireAgent(): Promise<Agent> {
  const agent = await getCurrentAgent();
  if (!agent) redirect(LOGIN_PATH);
  return agent;
}

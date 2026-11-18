"use server";

import { updateTag } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { HELP_CENTER_TAG } from "@/lib/help-center-cache";

/**
 * Makes the public help center show what was just changed. Articles are saved from the browser,
 * so the server only learns of a change when it is told here. Only the team can change what the
 * help center shows, so only the team may clear what it remembers.
 */
export async function refreshHelpCenter(): Promise<void> {
  if (!(await getCurrentAgent())) return;
  updateTag(HELP_CENTER_TAG);
}

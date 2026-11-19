"use server";

import { revalidateTag } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { HELP_CENTER_TAG } from "@/lib/help-center-cache";

/**
 * Tells the public help center to read again: an article was just changed. Articles are saved
 * from the browser, so the server only learns of a change when it is told here. Only the team
 * can change what the help center shows, so only the team may clear what it keeps.
 */
export async function refreshHelpCenter(): Promise<void> {
  if (!(await getCurrentAgent())) return;
  revalidateTag(HELP_CENTER_TAG, { expire: 0 });
}

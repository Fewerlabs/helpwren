"use server";

import { type PageHelp } from "@helpwren/core";
import { revalidateTag } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { resolvePageHelp } from "@/lib/contextual-help";
import { HELP_CENTER_TAG } from "@/lib/help-center-cache";
import { getHelpwren } from "@/lib/helpwren";

import { testPageSchema, type TestPageValues } from "./schemas";

/**
 * Tells the server to read the rules again: one was just changed. Rules are saved from the
 * browser, so the server learns of a change only when told here. Only the team may clear what
 * it keeps.
 */
export async function refreshContextualHelp(): Promise<void> {
  if (!(await getCurrentAgent())) return;
  revalidateTag(HELP_CENTER_TAG, { expire: 0 });
}

export type TestPageResult =
  { ok: true; help: PageHelp } | { ok: false; reason: "forbidden" | "invalid" };

/**
 * What the chat would show on a page: the articles, and the rule or fallback that chose them.
 * The page sends no filter of its own here, so it is the rules that are tried.
 */
export async function testPage(values: TestPageValues): Promise<TestPageResult> {
  if (!(await getCurrentAgent())) return { ok: false, reason: "forbidden" };
  const parsed = testPageSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { url, title, audience } = parsed.data;
  return {
    ok: true,
    help: await resolvePageHelp({ page: { url, title }, audience: audience || null }),
  };
}

export type SaveFallbackResult = { ok: true } | { ok: false; reason: "forbidden" };

/** Switches the search on the page's title, for pages nothing else finds help for. Admins only. */
export async function saveFallback(fallback: boolean): Promise<SaveFallbackResult> {
  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update({ contextualHelp: { fallback } });
  if (result.ok) revalidateTag(HELP_CENTER_TAG, { expire: 0 });
  return result;
}

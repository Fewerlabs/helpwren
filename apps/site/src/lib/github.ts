import { z } from "zod";

import { GITHUB_REPO } from "@/content/site";

const repoSchema = z.object({ stargazers_count: z.number().int().nonnegative() });

/** Below this, a count says more about the project's age than its use, so it is left out. */
export const MIN_STARS_SHOWN = 10;

/** How long a build waits for GitHub before leaving the count out. */
const TIMEOUT_MS = 4000;

/**
 * The repository's star count, read once while the site builds. Anything that goes wrong (no
 * network, a rate limit, a changed response) leaves the count out rather than failing the build.
 */
export async function getStarCount(): Promise<number | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "force-cache",
    });
    if (!response.ok) return null;
    const parsed = repoSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.stargazers_count : null;
  } catch {
    return null;
  }
}

/** 950 → "950", 1234 → "1.2k". */
export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  const thousands = Math.round(count / 100) / 10;
  return `${String(thousands)}k`;
}

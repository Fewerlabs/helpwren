import { z } from "zod";

/** The part of `/api/health` that says which build the server is running. */
export const healthVersionSchema = z.object({ version: z.string().min(1) });

/**
 * Whether the server runs a different build from the one this page was loaded from: a new
 * deploy, or one rolled back. Either way the page is out of date.
 */
export function isNewVersion(current: string, reported: string | undefined): boolean {
  return reported !== undefined && reported !== "" && reported !== current;
}

/** The build a service worker was registered for, from its address: `/sw.js?v=0.1.0+3f2a9c1`. */
export function workerVersion(scriptUrl: string): string | null {
  return new URL(scriptUrl, "http://localhost").searchParams.get("v");
}

/** The address the dashboard registers its service worker at, for one build. */
export function workerUrl(version: string, development: boolean): string {
  const params = new URLSearchParams({ v: version });
  if (development) params.set("dev", "1");
  return `/sw.js?${params.toString()}`;
}

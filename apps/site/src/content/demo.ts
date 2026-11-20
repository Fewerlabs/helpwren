/**
 * The live demo install whose widget the page loads, from NEXT_PUBLIC_HELPWREN_DEMO_URL at build
 * time, without a trailing slash. Empty when none is set: the page then shows captures only.
 * Kept out of the client components so server components read the real value.
 */
export const DEMO_URL = (process.env.NEXT_PUBLIC_HELPWREN_DEMO_URL ?? "").replace(/\/$/, "");

/** Runs once when the server starts, so invalid environment variables fail fast. */
export async function register() {
  await import("@/lib/env");
  await import("@/lib/server-env");
}

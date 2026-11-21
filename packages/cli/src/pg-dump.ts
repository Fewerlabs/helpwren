import { type Runner } from "./exec.ts";

/**
 * Where a newer pg_dump is often installed beside an older one on the PATH: Homebrew's client
 * tools and versioned servers (Apple silicon, then Intel), and Postgres.app.
 */
export const PG_DUMP_CANDIDATES = [
  "/opt/homebrew/opt/libpq/bin/pg_dump",
  "/opt/homebrew/opt/postgresql@18/bin/pg_dump",
  "/opt/homebrew/opt/postgresql@17/bin/pg_dump",
  "/usr/local/opt/libpq/bin/pg_dump",
  "/usr/local/opt/postgresql@18/bin/pg_dump",
  "/usr/local/opt/postgresql@17/bin/pg_dump",
  "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump",
  "/usr/lib/postgresql/18/bin/pg_dump",
  "/usr/lib/postgresql/17/bin/pg_dump",
] as const;

/** The server's major version from pg_dump's refusal, such as `server version: 17.12`. */
export function serverMajorFromMismatch(stderr: string): number | null {
  if (!stderr.includes("server version mismatch")) return null;
  const match = /server version:\s*(\d+)/.exec(stderr);
  return match ? Number(match[1]) : null;
}

/** pg_dump's major version, such as 15 from `pg_dump (PostgreSQL) 15.12`, or `null`. */
export async function pgDumpMajor(run: Runner, path: string): Promise<number | null> {
  const result = await run(path, ["--version"]).catch(() => null);
  if (result?.code !== 0) return null;
  const match = /\(PostgreSQL\)\s*(\d+)/.exec(result.stdout);
  return match ? Number(match[1]) : null;
}

/**
 * A pg_dump installed here that can back up a server of `serverMajor` or newer: pg_dump reads
 * older servers but refuses newer ones. The newest found wins.
 */
export async function findPgDump(run: Runner, serverMajor: number): Promise<string | null> {
  let best: { path: string; major: number } | null = null;
  for (const path of PG_DUMP_CANDIDATES) {
    const major = await pgDumpMajor(run, path);
    if (major !== null && major >= serverMajor && (best === null || major > best.major)) {
      best = { path, major };
    }
  }
  return best?.path ?? null;
}

/** What to install for a pg_dump of `serverMajor`, in one line for the person's system. */
export function installHint(serverMajor: number, platform: string = process.platform): string {
  return platform === "darwin"
    ? "Install newer client tools with `brew install libpq`, then run the upgrade again."
    : `Install the PostgreSQL ${serverMajor} client (for example \`postgresql-client-${serverMajor}\` from apt.postgresql.org), then run the upgrade again.`;
}

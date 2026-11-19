import { z } from "zod";

import { redactUrl, type Runner } from "./exec.ts";

/**
 * Which database the migrations go to: one named by its connection string, or the project
 * `supabase link` connected this checkout to.
 */
export type DbTarget = { kind: "url"; url: string } | { kind: "linked" };

const remote = (target: DbTarget) =>
  target.kind === "url" ? `--remote=${target.url}` : "--remote";

export const describeTarget = (target: DbTarget) =>
  target.kind === "url" ? redactUrl(target.url) : "the linked Supabase project";

// What `supabase db push --output-format json` prints when it is done.
const pushResultSchema = z.object({
  upToDate: z.boolean(),
  migrations: z.array(z.string()).default([]),
  seeds: z.array(z.string()).default([]),
});

export class DatabaseError extends Error {
  constructor(message: string, detail: string) {
    // The CLI's own words, with any password it echoed taken out.
    super(`${message}\n${redactUrl(detail.trim())}`);
    this.name = "DatabaseError";
  }
}

export interface PushOptions {
  dryRun: boolean;
  /** Load `supabase/seed.sql` too. Only when someone asked for the demo data. */
  seed?: boolean;
}

/**
 * Applies the migrations the database has not had, in order, with the Supabase CLI. Never
 * resets anything: `db push` only adds what is missing and records it in the migration history.
 * Returns the migrations it applied, or would apply on a dry run.
 */
export async function pushMigrations(
  run: Runner,
  root: string,
  target: DbTarget,
  { dryRun, seed = false }: PushOptions,
): Promise<string[]> {
  const args = [
    "exec",
    "supabase",
    "db",
    "push",
    remote(target),
    // Nothing in this repository's config is meant for a hosted project's vault.
    "--skip-vault",
    "--output-format",
    "json",
    ...(dryRun ? ["--dry-run"] : ["--yes"]),
    ...(seed ? ["--include-seed"] : []),
  ];
  const result = await run("pnpm", args, { cwd: root });
  if (result.code !== 0) {
    throw new DatabaseError("The Supabase CLI could not apply the migrations.", result.stderr);
  }
  const json = result.stdout.slice(result.stdout.indexOf("{"));
  const parsed = pushResultSchema.safeParse(JSON.parse(json || "{}"));
  if (!parsed.success) {
    throw new DatabaseError(
      "The Supabase CLI answered in a way this installer does not know.",
      json,
    );
  }
  return parsed.data.migrations;
}

/** Connects this checkout to a hosted Supabase project, which asks the person to sign in. */
export async function linkProject(run: Runner, root: string, projectRef: string): Promise<void> {
  const result = await run("pnpm", ["exec", "supabase", "link", "--project-ref", projectRef], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.code !== 0) throw new DatabaseError("Could not link the Supabase project.", "");
}

/** The project's id from its address, `https://<ref>.supabase.co`, or `null` for any other. */
export function projectRefFromUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    const match = /^([a-z0-9]{20})\.supabase\.(co|com|in)$/.exec(hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

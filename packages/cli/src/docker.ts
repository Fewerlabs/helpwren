import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseEnv } from "./env-file.ts";
import { type Runner } from "./exec.ts";
import { type Paths } from "./state.ts";

/**
 * The release of Supabase's official self-hosting setup this install runs. Its Compose file is
 * fetched at this tag, never edited, and included from `deploy/docker/docker-compose.yml`.
 * See https://supabase.com/docs/guides/self-hosting/docker. Change it deliberately, after
 * reading that release's CHANGELOG.md.
 */
export const SUPABASE_SELF_HOSTED_REF = "self-hosted/v0.8.4";

const REF_MARKER = ".helpwren-ref";

/**
 * Puts Supabase's `docker/` folder, at the pinned release, in `deploy/docker/supabase`. A copy
 * that is already there is left alone, even at another release: moving Supabase to a new
 * release is its own step, with its own notes.
 */
export async function fetchSupabaseDocker(
  run: Runner,
  paths: Paths,
): Promise<"fetched" | "present" | { other: string }> {
  const target = paths.supabaseSource;
  if (existsSync(join(target, "docker-compose.yml"))) {
    const marker = join(target, REF_MARKER);
    const ref = existsSync(marker) ? readFileSync(marker, "utf8").trim() : "unknown";
    return ref === SUPABASE_SELF_HOSTED_REF ? "present" : { other: ref };
  }

  const checkout = join(paths.dockerDir, ".supabase-checkout");
  // Only a half-finished fetch of our own can be here, so it is safe to start it again.
  rmSync(checkout, { recursive: true, force: true });
  const steps: (readonly string[])[] = [
    [
      "clone",
      "--quiet",
      "--depth=1",
      `--branch=${SUPABASE_SELF_HOSTED_REF}`,
      "--filter=blob:none",
      "--sparse",
      "https://github.com/supabase/supabase.git",
      checkout,
    ],
    ["-C", checkout, "sparse-checkout", "set", "docker"],
  ];
  for (const args of steps) {
    const result = await run("git", args);
    if (result.code !== 0) {
      throw new Error(`Could not fetch Supabase's self-hosting files: ${result.stderr.trim()}`);
    }
  }
  renameSync(join(checkout, "docker"), target);
  rmSync(checkout, { recursive: true, force: true });
  writeFileSync(join(target, REF_MARKER), `${SUPABASE_SELF_HOSTED_REF}\n`);
  return "fetched";
}

/**
 * Keys whose value in `.env` is still Supabase's published example, which everyone can read.
 * The installer always replaces those.
 */
export function placeholderKeys(paths: Paths, envText: string): string[] {
  const examplePath = join(paths.supabaseSource, ".env.example");
  if (!existsSync(examplePath)) return [];
  const example = parseEnv(readFileSync(examplePath, "utf8"));
  const current = parseEnv(envText);
  return [...current].filter(([key, value]) => example.get(key) === value).map(([key]) => key);
}

/** Helpwren's own services; everything else in the Compose file is Supabase's. */
const HELPWREN_SERVICES = ["helpwren", "scheduler"];

/**
 * Supabase's services, which must all be up before the migrations run: the database alone is
 * not enough, because Realtime and Storage create the schemas the migrations build on.
 */
export async function supabaseServices(run: Runner, paths: Paths): Promise<string[]> {
  const result = await run(
    "docker",
    ["compose", "--file", paths.dockerCompose, "config", "--services"],
    {
      cwd: paths.dockerDir,
    },
  );
  if (result.code !== 0) {
    throw new Error(`The Compose file is not valid: ${result.stderr.trim()}`);
  }
  return result.stdout
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name !== "" && !HELPWREN_SERVICES.includes(name));
}

/**
 * Runs `docker compose` on Helpwren's Compose file. The checkout's commit goes with it, so an
 * image built now reports it from `/api/health`; the build itself has no git history.
 */
export async function compose(run: Runner, paths: Paths, args: readonly string[]) {
  const commit = await run("git", ["rev-parse", "--short", "HEAD"], { cwd: paths.root });
  return run("docker", ["compose", "--file", paths.dockerCompose, ...args], {
    cwd: paths.dockerDir,
    stdio: "inherit",
    ...(commit.code === 0 ? { env: { HELPWREN_COMMIT: commit.stdout.trim() } } : {}),
  });
}

/**
 * The address the migrations reach the self-hosted database at: Supabase's pooler, published
 * on the host, which names the tenant in the user.
 */
export function dockerDatabaseUrl(env: Map<string, string>): string {
  const password = encodeURIComponent(env.get("POSTGRES_PASSWORD") ?? "");
  const tenant = env.get("POOLER_TENANT_ID") ?? "";
  const port = env.get("POSTGRES_PORT") ?? "5432";
  const database = env.get("POSTGRES_DB") ?? "postgres";
  return `postgresql://postgres.${tenant}:${password}@127.0.0.1:${port}/${database}`;
}

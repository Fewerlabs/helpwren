import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { InstallError, validDatabaseUrl, type Context } from "./context.ts";
import { describeTarget, pushMigrations, type DbTarget } from "./database.ts";
import { compose, dockerDatabaseUrl } from "./docker.ts";
import { parseEnv, readEnvFile } from "./env-file.ts";
import { readState, writeState, type InstallState } from "./state.ts";

export interface UpgradeOptions {
  /** Show what would happen and change nothing. */
  dryRun: boolean;
  /** `false` uses the code already checked out instead of pulling. */
  pull: boolean;
  /** `undefined` asks; the answer's default is yes. */
  backup?: boolean;
  dbUrl?: string;
}

async function git(ctx: Context, args: readonly string[]) {
  return ctx.run("git", args, { cwd: ctx.paths.root });
}

/** Brings in the new version with a fast-forward, so local changes are never merged over. */
async function updateCode(ctx: Context, options: UpgradeOptions): Promise<void> {
  ctx.out.step("The new version");
  if (!options.pull) {
    ctx.out.info("Using the code that is checked out (--no-pull).");
    return;
  }
  const status = await git(ctx, ["status", "--porcelain", "--untracked-files=no"]);
  if (status.stdout.trim() !== "") {
    throw new InstallError(
      "This checkout has changes that are not committed. Commit or set them aside, or pass --no-pull.",
    );
  }
  if ((await git(ctx, ["fetch", "--quiet"])).code !== 0) {
    throw new InstallError(
      "Could not fetch from the remote. Check your connection, or pass --no-pull.",
    );
  }
  const incoming = await git(ctx, ["log", "--oneline", "HEAD..@{upstream}"]);
  const commits = incoming.stdout.trim().split("\n").filter(Boolean);
  if (commits.length === 0) {
    ctx.out.ok("Already on the newest version of this branch");
    return;
  }
  ctx.out.info(`${commits.length} new commits, the newest: ${commits[0]}`);
  if (options.dryRun) return;
  if ((await git(ctx, ["merge", "--ff-only", "@{upstream}"])).code !== 0) {
    throw new InstallError(
      "This branch has moved apart from the remote. Pull it yourself, then run with --no-pull.",
    );
  }
  if (
    (
      await ctx.run("pnpm", ["install", "--frozen-lockfile"], {
        cwd: ctx.paths.root,
        stdio: "inherit",
      })
    ).code !== 0
  ) {
    throw new InstallError("`pnpm install` failed.");
  }
  ctx.out.ok("Updated");
}

async function databaseTarget(
  ctx: Context,
  state: InstallState,
  options: UpgradeOptions,
): Promise<DbTarget> {
  if (state.mode === "docker") {
    return { kind: "url", url: dockerDatabaseUrl(parseEnv(readEnvFile(ctx.paths.dockerEnv))) };
  }
  const url =
    options.dbUrl ??
    (await ctx.prompt.text(
      "Database connection string. Leave empty to use the project `supabase link` connected",
      { secret: true, validate: validDatabaseUrl },
    ));
  return url === "" ? { kind: "linked" } : { kind: "url", url };
}

/** pg_dump from a connection string, with the password in its environment, not its arguments. */
function dumpUrl(ctx: Context, connection: string, file: string) {
  const url = new URL(connection);
  const password = decodeURIComponent(url.password);
  url.password = "";
  return ctx.run("pg_dump", ["--format=custom", `--dbname=${url.toString()}`], {
    env: { PGPASSWORD: password },
    stdoutFile: file,
  });
}

/**
 * A full copy of the database, before anything changes it. Taken only with consent, because it
 * can be large and holds every conversation.
 */
async function backUp(ctx: Context, state: InstallState, target: DbTarget): Promise<string | null> {
  mkdirSync(ctx.paths.backups, { recursive: true, mode: 0o700 });
  const file = join(
    ctx.paths.backups,
    `helpwren-${ctx.now().toISOString().replaceAll(":", "-")}.dump`,
  );
  const result =
    state.mode === "docker"
      ? await ctx.run(
          "docker",
          [
            "compose",
            "--file",
            ctx.paths.dockerCompose,
            "exec",
            "-T",
            "db",
            "pg_dump",
            "--username=postgres",
            "--format=custom",
            "postgres",
          ],
          { cwd: ctx.paths.dockerDir, stdoutFile: file },
        )
      : target.kind === "url"
        ? await dumpUrl(ctx, target.url, file)
        : null;
  if (result === null) {
    ctx.out.warn(
      "No connection string, so no copy was taken here. Make sure the project has a recent backup (Supabase dashboard: Database, then Backups).",
    );
    return null;
  }
  if (result.code !== 0) {
    throw new InstallError(
      `The backup failed, so nothing was changed. ${result.stderr.trim() || "Is pg_dump installed?"}`,
    );
  }
  ctx.out.ok(`Saved ${file}`);
  return file;
}

/**
 * `pnpm helpwren upgrade`: the new code, its migrations and a restart, with a backup first.
 * `--dry-run` shows each step and changes nothing.
 */
export async function upgrade(ctx: Context, options: UpgradeOptions): Promise<void> {
  const state = readState(ctx.paths);
  if (!state) {
    throw new InstallError("No install found here. Run `pnpm helpwren install` first.");
  }
  if (options.dryRun) ctx.out.info("Dry run: nothing will be changed.");

  await updateCode(ctx, options);

  const target = await databaseTarget(ctx, state, options);
  ctx.out.step(`Migrations for ${describeTarget(target)}`);
  const pending = await pushMigrations(ctx.run, ctx.paths.root, target, { dryRun: true });
  if (pending.length === 0) ctx.out.ok("None waiting");
  for (const name of pending) ctx.out.info(`• ${name}`);

  if (options.dryRun) {
    ctx.out.step("Would then");
    if (pending.length > 0) ctx.out.info("Back up the database, then apply the migrations above.");
    ctx.out.info(
      state.mode === "docker" ? "Rebuild and restart the app container." : "Rebuild the app.",
    );
    return;
  }

  let backup: string | null = null;
  if (pending.length > 0) {
    const consent =
      options.backup ?? (await ctx.prompt.confirm("Take a backup of the database first?", true));
    if (consent) backup = await backUp(ctx, state, target);
    else ctx.out.warn("No backup taken.");
    await pushMigrations(ctx.run, ctx.paths.root, target, { dryRun: false });
    ctx.out.ok(`Applied ${pending.length} migrations`);
  }

  ctx.out.step("Rebuilding");
  if (state.mode === "docker") {
    if (
      (
        await compose(ctx.run, ctx.paths, [
          "up",
          "--detach",
          "--build",
          "--wait",
          "helpwren",
          "scheduler",
        ])
      ).code !== 0
    ) {
      throw new InstallError(
        "The app did not come back up. See `docker compose logs helpwren` in deploy/docker.",
      );
    }
    ctx.out.ok("The app is running the new version");
  } else {
    if ((await ctx.run("pnpm", ["build"], { cwd: ctx.paths.root, stdio: "inherit" })).code !== 0) {
      throw new InstallError(
        "The build failed. The database is migrated; fix the build and run again.",
      );
    }
    ctx.out.ok(
      "Built. Restart the app, or deploy this commit to your host (Vercel deploys on push).",
    );
  }

  writeState(ctx.paths, { ...state, upgradedAt: ctx.now().toISOString() });
  if (backup)
    ctx.out.info(
      `To roll back: https://helpwren.fewerlabs.dev/docs/operations/backups. Backup: ${backup}`,
    );
}

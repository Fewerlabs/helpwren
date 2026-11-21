#!/usr/bin/env node
// `pnpm helpwren <install|upgrade|auth>`. See https://helpwren.fewerlabs.dev/docs/get-started, or run with --help.
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { z } from "zod";

import { auth, type AuthOptions } from "./auth.ts";
import { InstallError, type Context } from "./context.ts";
import { DatabaseError } from "./database.ts";
import { spawnRunner } from "./exec.ts";
import { install, type InstallOptions } from "./install.ts";
import { consoleOutput, MissingAnswerError, terminalPrompter, unattendedPrompter } from "./io.ts";
import { installModeSchema, pathsFor } from "./state.ts";
import { upgrade, type UpgradeOptions } from "./upgrade.ts";

const HELP = `Usage: pnpm helpwren <command> [options]

Commands
  install    Set up this copy of Helpwren: env file, database migrations, next steps
  upgrade    Bring in the new version, apply its migrations, rebuild
  auth       Set Supabase Auth up on a hosted project: the sign-in code email,
             anonymous sign-ins and the Site URL. For when install had no token

Install options (each also read from the environment variable in brackets)
  --mode cloud|docker        How to run it [HELPWREN_MODE]
  --app-url <url>            Where Helpwren will be reached [NEXT_PUBLIC_APP_URL]
  --supabase-url <url>       Supabase project URL [NEXT_PUBLIC_SUPABASE_URL]
  --publishable-key <key>    [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY]
  --secret-key <key>         [SUPABASE_SECRET_KEY]
  --db-url <url>             Postgres connection string for migrations [SUPABASE_DB_URL]
  --access-token <token>     Applies the Auth settings to a hosted project [SUPABASE_ACCESS_TOKEN]
  --demo-data                Load the demo data (off unless asked)
  --overwrite                Replace values already in the env file (never secrets)
  --skip-prereqs             Do not check Node, pnpm and Docker
  --no-start                 Docker: write the configuration only, start nothing

Upgrade options
  --dry-run                  Show what would happen and change nothing
  --no-pull                  Use the code already checked out
  --backup / --no-backup     Back up the database first, without asking
  --db-url <url>             [SUPABASE_DB_URL]

Auth options
  --supabase-url <url>       Defaults to the one in apps/web/.env.local
  --app-url <url>            Defaults to the one in apps/web/.env.local
  --access-token <token>     From supabase.com/dashboard/account/tokens [SUPABASE_ACCESS_TOKEN]

All
  --yes                      Ask nothing: take flags, the environment and defaults (for CI)
  --help`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    mode: { type: "string" },
    "app-url": { type: "string" },
    "supabase-url": { type: "string" },
    "publishable-key": { type: "string" },
    "secret-key": { type: "string" },
    "db-url": { type: "string" },
    "access-token": { type: "string" },
    "demo-data": { type: "boolean" },
    overwrite: { type: "boolean", default: false },
    "skip-prereqs": { type: "boolean", default: false },
    start: { type: "boolean", default: true },
    "dry-run": { type: "boolean", default: false },
    pull: { type: "boolean", default: true },
    backup: { type: "boolean" },
    yes: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

const env = process.env;
// An empty value counts as not given, as it does in the app's env files.
const given = (...candidates: (string | undefined)[]) =>
  candidates.find((value) => value !== undefined && value !== "");
const withValue = <Key extends string, Value>(key: Key, value: Value | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<Key, Value>>;

const unattended = values.yes || !process.stdin.isTTY || Boolean(env.CI);
const ctx: Context = {
  paths: pathsFor(fileURLToPath(new URL("../../..", import.meta.url))),
  run: spawnRunner,
  prompt: unattended ? unattendedPrompter() : terminalPrompter(),
  out: consoleOutput,
  fetch: (url, init) => fetch(url, init),
  now: () => new Date(),
};

async function main(): Promise<void> {
  const [command] = positionals;
  if (values.help || command === undefined) {
    console.log(HELP);
    return;
  }

  const dbUrl = given(values["db-url"], env.SUPABASE_DB_URL);
  if (command === "install") {
    const mode = given(values.mode, env.HELPWREN_MODE);
    const options: InstallOptions = {
      overwrite: values.overwrite,
      skipPrereqs: values["skip-prereqs"],
      noStart: !values.start,
      ...withValue("mode", mode === undefined ? undefined : installModeSchema.parse(mode)),
      ...withValue("appUrl", given(values["app-url"], env.NEXT_PUBLIC_APP_URL)),
      ...withValue("supabaseUrl", given(values["supabase-url"], env.NEXT_PUBLIC_SUPABASE_URL)),
      ...withValue(
        "publishableKey",
        given(values["publishable-key"], env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      ),
      ...withValue("secretKey", given(values["secret-key"], env.SUPABASE_SECRET_KEY)),
      // Unattended, an empty database address means "use the linked project".
      ...withValue("dbUrl", dbUrl ?? (unattended ? "" : undefined)),
      ...withValue("accessToken", given(values["access-token"], env.SUPABASE_ACCESS_TOKEN)),
      ...withValue("demoData", values["demo-data"] ?? (unattended ? false : undefined)),
    };
    await install(ctx, options);
    return;
  }
  if (command === "upgrade") {
    const options: UpgradeOptions = {
      dryRun: values["dry-run"],
      pull: values.pull,
      ...withValue("backup", values.backup),
      ...withValue("dbUrl", dbUrl ?? (unattended ? "" : undefined)),
    };
    await upgrade(ctx, options);
    return;
  }
  if (command === "auth") {
    const options: AuthOptions = {
      ...withValue("supabaseUrl", given(values["supabase-url"], env.NEXT_PUBLIC_SUPABASE_URL)),
      ...withValue("appUrl", given(values["app-url"], env.NEXT_PUBLIC_APP_URL)),
      ...withValue("accessToken", given(values["access-token"], env.SUPABASE_ACCESS_TOKEN)),
    };
    await auth(ctx, options);
    return;
  }
  throw new InstallError(`Unknown command "${command}". Run with --help to see the commands.`);
}

try {
  await main();
} catch (error) {
  // Problems the person can fix are printed plainly; anything else keeps its stack trace.
  const known =
    error instanceof InstallError ||
    error instanceof DatabaseError ||
    error instanceof MissingAnswerError ||
    error instanceof z.ZodError;
  console.error(
    `\n${known ? error.message : String(error instanceof Error ? error.stack : error)}`,
  );
  process.exitCode = 1;
}

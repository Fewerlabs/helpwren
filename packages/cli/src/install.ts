import { readFileSync } from "node:fs";
import { join } from "node:path";

import { applyAuthSettings, authSettings } from "./auth-config.ts";
import { InstallError, trimSlash, validDatabaseUrl, validUrl, type Context } from "./context.ts";
import {
  describeTarget,
  linkProject,
  projectRefFromUrl,
  pushMigrations,
  type DbTarget,
} from "./database.ts";
import {
  compose,
  dockerDatabaseUrl,
  fetchSupabaseDocker,
  placeholderKeys,
  SUPABASE_SELF_HOSTED_REF,
  supabaseServices,
} from "./docker.ts";
import { mergeEnv, parseEnv, readEnvFile, writeEnvFile, type MergeResult } from "./env-file.ts";
import { dockerChecks, toolchainChecks, type Check } from "./prereqs.ts";
import { randomHex, selfHostedSecrets, supabaseRoleKey } from "./secrets.ts";
import { readState, writeState, type InstallMode } from "./state.ts";

/** What can be given up front, from flags or the environment, instead of being asked. */
export interface InstallOptions {
  mode?: InstallMode;
  appUrl?: string;
  supabaseUrl?: string;
  publishableKey?: string;
  secretKey?: string;
  /** A Postgres connection string for the migrations. */
  dbUrl?: string;
  /** A Supabase personal access token, to apply the Auth settings to a hosted project. */
  accessToken?: string;
  /** `undefined` asks; the answer's default is no. */
  demoData?: boolean;
  /** Replace values already in the env file with the ones given now. Secrets are never replaced. */
  overwrite: boolean;
  skipPrereqs: boolean;
  /** Docker only: write the configuration and stop, to review it before anything starts. */
  noStart?: boolean;
}

function reportChecks(ctx: Context, checks: Check[]): void {
  for (const check of checks) {
    if (check.ok) ctx.out.ok(`${check.name} (${check.found})`);
    else ctx.out.warn(`${check.name}: ${check.found}. ${check.fix}`);
  }
  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new InstallError(
      `Fix ${failed.map((check) => check.name).join(", ")} and run the installer again.`,
    );
  }
}

/** Says which keys were written and which kept. Never their values. */
function reportEnv(ctx: Context, file: string, answers: MergeResult, secrets: MergeResult): void {
  const written = [...answers.written, ...secrets.written];
  if (written.length > 0) ctx.out.ok(`Wrote ${written.join(", ")} to ${file}`);
  if (answers.kept.length > 0) {
    ctx.out.info(
      `Kept the existing ${answers.kept.join(", ")} (pass --overwrite to replace them).`,
    );
  }
  // Replacing a secret would break what already uses it, so it is never done.
  if (secrets.kept.length > 0) ctx.out.info(`Kept the existing ${secrets.kept.join(", ")}.`);
  if (written.length === 0) ctx.out.ok(`${file} already had everything`);
}

async function applyMigrations(ctx: Context, target: DbTarget, demoData: boolean): Promise<void> {
  ctx.out.step(`Applying the database migrations to ${describeTarget(target)}`);
  const pending = await pushMigrations(ctx.run, ctx.paths.root, target, { dryRun: true });
  if (pending.length === 0) {
    ctx.out.ok("The database is up to date");
  } else {
    ctx.out.info(`${pending.length} to apply, from ${pending[0]} to ${pending.at(-1)}.`);
    await pushMigrations(ctx.run, ctx.paths.root, target, { dryRun: false });
    ctx.out.ok(`Applied ${pending.length} migrations`);
  }
  if (demoData) {
    await pushMigrations(ctx.run, ctx.paths.root, target, { dryRun: false, seed: true });
    ctx.out.ok("Loaded the demo data");
  }
}

async function askDemoData(ctx: Context, options: InstallOptions): Promise<boolean> {
  if (options.demoData !== undefined) return options.demoData;
  ctx.out.info(
    "Demo data adds sample conversations and two demo team members (ada@example.com, an admin). " +
      "With it, the setup wizard is skipped. Leave it out for a real install.",
  );
  return ctx.prompt.confirm("Load the demo data?", false);
}

async function installCloud(ctx: Context, options: InstallOptions): Promise<string> {
  const file = ctx.paths.webEnv;
  const existing = parseEnv(readEnvFile(file));

  ctx.out.step("Your Supabase project");
  ctx.out.info(
    "In the Supabase dashboard: the Project URL is under Connect (top of the page), then Framework, as NEXT_PUBLIC_SUPABASE_URL; or Project Settings, then Data API.",
  );
  ctx.out.info("The keys are under Project Settings, then API Keys.");
  const appUrl = trimSlash(
    options.appUrl ??
      (await ctx.prompt.text("The address Helpwren will be reached at", {
        fallback: existing.get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
        validate: validUrl,
      })),
  );
  const supabaseUrl = trimSlash(
    options.supabaseUrl ??
      (await ctx.prompt.text("Project URL (https://<ref>.supabase.co)", {
        ...optionalFallback(existing.get("NEXT_PUBLIC_SUPABASE_URL")),
        validate: validUrl,
      })),
  );
  const publishableKey =
    options.publishableKey ??
    (await ctx.prompt.text("Publishable key (sb_publishable_…)", {
      ...optionalFallback(existing.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")),
    }));
  const secretKey =
    options.secretKey ??
    (await ctx.prompt.text("Secret key (sb_secret_…)", {
      ...optionalFallback(existing.get("SUPABASE_SECRET_KEY")),
      secret: true,
    }));

  ctx.out.step(`Writing ${file}`);
  const answers = mergeEnv(
    readEnvFile(file),
    {
      NEXT_PUBLIC_APP_URL: appUrl,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      SUPABASE_SECRET_KEY: secretKey,
    },
    { overwrite: options.overwrite, header: "Written by `pnpm helpwren install`." },
  );
  // A secret the scheduler presents to run timed work. Made once and never replaced, so a
  // scheduler set up with it keeps working when the installer runs again.
  const generated = mergeEnv(answers.text, { CRON_SECRET: randomHex(32) });
  writeEnvFile(file, generated.text);
  reportEnv(ctx, file, answers, generated);

  ctx.out.step("The database");
  ctx.out.info(
    "Connect (top of the dashboard), then Direct, then Session pooler: the one on port 5432. Put your database password in place of [YOUR-PASSWORD]. It is hidden as you type or paste.",
  );
  const projectRef = projectRefFromUrl(supabaseUrl);
  const dbUrl =
    options.dbUrl ??
    (await ctx.prompt.text(
      "Session pooler connection string. Leave empty to sign in with `supabase link` instead",
      { secret: true, validate: validDatabaseUrl },
    ));
  let target: DbTarget;
  if (dbUrl !== "") {
    target = { kind: "url", url: dbUrl };
  } else if (projectRef) {
    await linkProject(ctx.run, ctx.paths.root, projectRef);
    target = { kind: "linked" };
  } else {
    throw new InstallError(
      "Give the database connection string with --db-url, or use a hosted project's URL so the installer can run `supabase link`.",
    );
  }
  await applyMigrations(ctx, target, await askDemoData(ctx, options));

  ctx.out.step("Supabase Auth settings");
  const settings = authSettings(ctx.paths.root, appUrl);
  if (projectRef && options.accessToken) {
    const problem = await applyAuthSettings(ctx.fetch, projectRef, options.accessToken, settings);
    if (problem) throw new InstallError(`Could not change the Auth settings. ${problem}`);
    ctx.out.ok("Anonymous sign-ins on, sign-in codes in the email, Site URL set");
  } else {
    ctx.out.warn(
      "Set these once with `pnpm helpwren auth`, or in the Supabase dashboard: " +
        "Authentication, then Sign In / Providers: allow anonymous sign-ins. " +
        "Authentication, then Emails, Magic link: paste supabase/templates/sign-in-code.html. " +
        `URL Configuration: Site URL ${appUrl}. See https://helpwren.fewerlabs.dev/docs/get-started/supabase-cloud#configure-auth`,
    );
  }

  return appUrl;
}

const optionalFallback = (value: string | undefined) => (value ? { fallback: value } : {});

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);

async function installDocker(ctx: Context, options: InstallOptions): Promise<string> {
  if (!options.skipPrereqs) reportChecks(ctx, await dockerChecks(ctx.run));

  ctx.out.step(`Supabase's self-hosting files (${SUPABASE_SELF_HOSTED_REF})`);
  const fetched = await fetchSupabaseDocker(ctx.run, ctx.paths);
  if (fetched === "fetched") ctx.out.ok(`Fetched into ${ctx.paths.supabaseSource}`);
  else if (fetched === "present") ctx.out.ok("Already here");
  else
    ctx.out.warn(`Found ${fetched.other}, not ${SUPABASE_SELF_HOSTED_REF}. Leaving it as it is.`);

  const file = ctx.paths.dockerEnv;
  // A new install starts from Supabase's own example, so every setting it documents is there.
  const start =
    readEnvFile(file) || readFileSync(join(ctx.paths.supabaseSource, ".env.example"), "utf8");
  const existing = parseEnv(start);
  const placeholders = placeholderKeys(ctx.paths, start);
  const current = (key: string) => (placeholders.includes(key) ? undefined : existing.get(key));

  ctx.out.step("Addresses");
  const appUrl = trimSlash(
    options.appUrl ??
      (await ctx.prompt.text("The address Helpwren will be reached at", {
        fallback: current("HELPWREN_APP_URL") ?? "http://localhost:3000",
        validate: validUrl,
      })),
  );
  const supabaseUrl = trimSlash(
    options.supabaseUrl ??
      (await ctx.prompt.text("The address Supabase's API will be reached at", {
        fallback: current("SUPABASE_PUBLIC_URL") ?? "http://localhost:8000",
        validate: validUrl,
      })),
  );
  const mailbox = await ctx.prompt.confirm(
    "Catch sign-in emails in a local test mailbox (Mailpit) instead of sending them?",
    isLocal(appUrl),
  );

  ctx.out.step(`Writing ${file}`);
  const answers = mergeEnv(
    start,
    {
      HELPWREN_APP_URL: appUrl,
      SUPABASE_PUBLIC_URL: supabaseUrl,
      API_EXTERNAL_URL: `${supabaseUrl}/auth/v1`,
      SITE_URL: appUrl,
      // Guests chat with anonymous sessions.
      ENABLE_ANONYMOUS_USERS: "true",
      // Trying it on this machine at another port: the container is published there too.
      ...(isLocal(appUrl) && new URL(appUrl).port ? { HELPWREN_PORT: new URL(appUrl).port } : {}),
      ...(mailbox
        ? {
            SMTP_HOST: "mail",
            SMTP_PORT: "1025",
            // No sign-in: Auth refuses to send a password over the mailbox's plain connection.
            SMTP_USER: "",
            SMTP_PASS: "",
            COMPOSE_PROFILES: "mail",
          }
        : {}),
    },
    { overwrite: options.overwrite, replace: placeholders, header: "Helpwren" },
  );
  // Secrets are made once. The API keys are signed with the JWT secret, so a kept secret signs
  // any key that is still the published example.
  const secrets = selfHostedSecrets();
  const jwtSecret = current("JWT_SECRET") ?? secrets.JWT_SECRET ?? "";
  const generated = mergeEnv(
    answers.text,
    {
      ...secrets,
      JWT_SECRET: jwtSecret,
      ANON_KEY: supabaseRoleKey("anon", jwtSecret, ctx.now()),
      SERVICE_ROLE_KEY: supabaseRoleKey("service_role", jwtSecret, ctx.now()),
      CRON_SECRET: randomHex(32),
    },
    { replace: placeholders },
  );
  writeEnvFile(file, generated.text);
  reportEnv(ctx, file, answers, generated);

  if (options.noStart) {
    ctx.out.step("Not started (--no-start)");
    ctx.out.info("Review the files, then run `pnpm helpwren install --mode docker` again.");
    return appUrl;
  }

  ctx.out.step("Starting Supabase");
  const services = await supabaseServices(ctx.run, ctx.paths);
  if ((await compose(ctx.run, ctx.paths, ["up", "--detach", "--wait", ...services])).code !== 0) {
    throw new InstallError("Supabase did not start. See `docker compose ps` in deploy/docker.");
  }
  await applyMigrations(
    ctx,
    { kind: "url", url: dockerDatabaseUrl(parseEnv(generated.text)) },
    await askDemoData(ctx, options),
  );

  ctx.out.step("Building and starting Helpwren");
  if ((await compose(ctx.run, ctx.paths, ["up", "--detach", "--build", "--wait"])).code !== 0) {
    throw new InstallError("Not everything started. See `docker compose ps` in deploy/docker.");
  }
  ctx.out.ok(
    `Supabase Studio: ${supabaseUrl} (DASHBOARD_USERNAME and DASHBOARD_PASSWORD in ${file})`,
  );
  if (mailbox) ctx.out.ok("Test mailbox: http://localhost:8025");
  return appUrl;
}

/**
 * `pnpm helpwren install`. Safe to run again: values already set are kept unless --overwrite
 * says otherwise, secrets are never replaced, migrations only add what is missing, and nothing
 * is ever reset or deleted.
 */
export async function install(ctx: Context, options: InstallOptions): Promise<void> {
  if (!options.skipPrereqs) {
    ctx.out.step("Checking this machine");
    reportChecks(ctx, await Promise.all(toolchainChecks(ctx.run, ctx.paths.root)));
  }

  const state = readState(ctx.paths);
  const mode =
    options.mode ??
    (await ctx.prompt.select<InstallMode>(
      "How will you run Helpwren?",
      [
        {
          value: "cloud",
          label: "Supabase Cloud and a Node host such as Vercel",
          hint: "recommended, the quickest",
        },
        { value: "docker", label: "All on your own server, with Docker Compose" },
      ],
      state?.mode ?? "cloud",
    ));

  const appUrl =
    mode === "cloud" ? await installCloud(ctx, options) : await installDocker(ctx, options);

  const now = ctx.now().toISOString();
  writeState(ctx.paths, {
    mode,
    appUrl,
    installedAt: state?.installedAt ?? now,
    ...(state?.upgradedAt ? { upgradedAt: state.upgradedAt } : {}),
  });

  ctx.out.step("Done. Next:");
  if (mode === "cloud") {
    ctx.out.info("Run it here:   pnpm build && pnpm --filter @helpwren/web start");
    ctx.out.info(
      "Or deploy apps/web to Vercel with the same four variables: https://helpwren.fewerlabs.dev/docs/get-started/supabase-cloud",
    );
  }
  ctx.out.info(`Open ${appUrl}/setup to create the first admin.`);
  ctx.out.info(
    "Have a scheduler call /api/jobs/email and /api/jobs/push every minute with CRON_SECRET" +
      (mode === "docker"
        ? " (the scheduler container already does)."
        : ": https://helpwren.fewerlabs.dev/docs/operations/scheduled-jobs"),
  );
}

import { readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { install, type InstallOptions } from "./install.ts";
import { MissingAnswerError, unattendedPrompter } from "./io.ts";
import { readState } from "./state.ts";
import { fakeRunner, makeContext, makeRoot, scriptedPrompter } from "./test-support.ts";

const SECRET_KEY = "sb_secret_do-not-print-me";

const cloud: InstallOptions = {
  mode: "cloud",
  appUrl: "https://support.example.com/",
  supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  publishableKey: "sb_publishable_123",
  secretKey: SECRET_KEY,
  dbUrl: "postgresql://postgres.abc:db-password@pooler.example.com:5432/postgres",
  demoData: false,
  overwrite: false,
  skipPrereqs: true,
};

const pushes = (calls: ReturnType<typeof fakeRunner>["calls"]) =>
  calls.filter((call) => call.args.includes("push")).map((call) => call.args);

describe("install on Supabase Cloud", () => {
  it("writes the env file, applies the migrations and remembers the install", async () => {
    const root = makeRoot();
    const runner = fakeRunner([
      "20261118160000_core_tables.sql",
      "20261128100000_install_status.sql",
    ]);
    const { ctx, printed } = makeContext(root, { run: runner.run, prompt: unattendedPrompter() });

    await install(ctx, cloud);

    const env = readFileSync(ctx.paths.webEnv, "utf8");
    expect(env).toContain("NEXT_PUBLIC_APP_URL=https://support.example.com\n");
    expect(env).toContain(`SUPABASE_SECRET_KEY=${SECRET_KEY}`);
    expect(env).toMatch(/CRON_SECRET=[0-9a-f]{64}/);
    expect(statSync(ctx.paths.webEnv).mode & 0o777).toBe(0o600);

    // A dry run to list them, then the push. Never the seed, never a reset.
    expect(pushes(runner.calls)).toEqual([
      expect.arrayContaining(["--dry-run", `--remote=${cloud.dbUrl ?? ""}`]),
      expect.arrayContaining(["--yes"]),
    ]);
    const everything = runner.calls.flatMap((call) => call.args).join(" ");
    expect(everything).not.toContain("--include-seed");
    expect(everything).not.toContain("reset");

    expect(readState(ctx.paths)).toMatchObject({
      mode: "cloud",
      appUrl: "https://support.example.com",
    });
    expect(printed.join("\n")).toContain("https://support.example.com/setup");
  });

  it("never prints a secret or the database password", async () => {
    const root = makeRoot();
    const { ctx, printed } = makeContext(root, { prompt: unattendedPrompter() });
    await install(ctx, cloud);

    const cronSecret = /CRON_SECRET=(\w+)/.exec(readFileSync(ctx.paths.webEnv, "utf8"))?.[1] ?? "";
    const shown = printed.join("\n");
    expect(shown).not.toContain(SECRET_KEY);
    expect(shown).not.toContain(cronSecret);
    expect(shown).not.toContain("db-password");
  });

  it("keeps what is there when run again, unless told to overwrite, and never makes a new secret", async () => {
    const root = makeRoot();
    const { ctx } = makeContext(root, { prompt: unattendedPrompter() });
    await install(ctx, cloud);
    const first = readFileSync(ctx.paths.webEnv, "utf8");

    await install(ctx, { ...cloud, secretKey: "sb_secret_other" });
    expect(readFileSync(ctx.paths.webEnv, "utf8")).toBe(first);

    await install(ctx, { ...cloud, secretKey: "sb_secret_other", overwrite: true });
    const third = readFileSync(ctx.paths.webEnv, "utf8");
    expect(third).toContain("SUPABASE_SECRET_KEY=sb_secret_other");
    expect(/CRON_SECRET=\w+/.exec(third)?.[0]).toBe(/CRON_SECRET=\w+/.exec(first)?.[0]);
  });

  it("asks for what it was not given, offering what the env file already has", async () => {
    const root = makeRoot();
    const runner = fakeRunner(["20261118160000_core_tables.sql"]);
    const prompt = scriptedPrompter({
      "How will you run": "cloud",
      "reached at": "http://localhost:3000",
      "Project URL": "http://127.0.0.1:55421",
      "Publishable key": "sb_publishable_local",
      "Secret key": "sb_secret_local",
      "connection string": "postgresql://postgres:postgres@127.0.0.1:55422/postgres",
      "demo data": true,
    });
    const { ctx, printed } = makeContext(root, { run: runner.run, prompt });

    await install(ctx, { overwrite: false, skipPrereqs: true });

    expect(prompt.asked).toHaveLength(7);
    // The demo data is a separate push with the seed, after the migrations.
    expect(pushes(runner.calls).at(-1)).toContain("--include-seed");
    // Not a hosted project, so the Auth settings are left as steps to do by hand.
    expect(printed.join("\n")).toContain("allow anonymous sign-ins");
  });

  it("applies the Auth settings to a hosted project when given an access token", async () => {
    const root = makeRoot();
    const requests: { url: string; body: string }[] = [];
    const { ctx } = makeContext(root, {
      prompt: unattendedPrompter(),
      fetch: (url, init) => {
        requests.push({ url, body: typeof init.body === "string" ? init.body : "" });
        return Promise.resolve(new Response(null, { status: 200 }));
      },
    });

    await install(ctx, { ...cloud, accessToken: "sbp_token" });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/config/auth",
    );
    expect(JSON.parse(requests[0]?.body ?? "{}")).toMatchObject({
      external_anonymous_users_enabled: true,
      mailer_otp_length: 6,
      site_url: "https://support.example.com",
    });
  });

  it("stops in CI when a required value is missing, before writing anything", async () => {
    const root = makeRoot();
    const { ctx } = makeContext(root, { prompt: unattendedPrompter() });
    const { supabaseUrl: _omitted, ...withoutUrl } = cloud;

    await expect(install(ctx, withoutUrl)).rejects.toBeInstanceOf(MissingAnswerError);
    expect(readState(ctx.paths)).toBeNull();
  });

  it("stops with the fix when a prerequisite is missing", async () => {
    const root = makeRoot();
    const runner = fakeRunner(
      [],
      (call) => call.command === "pnpm" && call.args[0] === "--version",
    );
    const { ctx, printed } = makeContext(root, { run: runner.run, prompt: unattendedPrompter() });

    await expect(install(ctx, { ...cloud, skipPrereqs: false })).rejects.toThrow("pnpm 12");
    expect(printed.join("\n")).toContain("npm install --global pnpm@12");
  });
});

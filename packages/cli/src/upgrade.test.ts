import { describe, expect, it } from "vitest";

import { unattendedPrompter } from "./io.ts";
import { readState, writeState } from "./state.ts";
import { fakeRunner, makeContext, makeRoot } from "./test-support.ts";
import { upgrade } from "./upgrade.ts";

const DB_URL = "postgresql://postgres.abc:db-password@pooler.example.com:5432/postgres";

function installed(pending: string[]) {
  const root = makeRoot();
  const runner = fakeRunner(pending);
  const { ctx, printed } = makeContext(root, { run: runner.run, prompt: unattendedPrompter() });
  writeState(ctx.paths, {
    mode: "cloud",
    appUrl: "https://support.example.com",
    installedAt: "2026-11-01T00:00:00.000Z",
  });
  const ran = () => runner.calls.map((call) => [call.command, ...call.args].join(" "));
  return { ctx, printed, ran };
}

describe("upgrade", () => {
  it("on a dry run, lists the waiting migrations and changes nothing", async () => {
    const { ctx, printed, ran } = installed(["20261128100000_install_status.sql"]);

    await upgrade(ctx, { dryRun: true, pull: true, dbUrl: DB_URL });

    expect(printed.join("\n")).toContain("• 20261128100000_install_status.sql");
    const commands = ran();
    expect(commands.filter((command) => command.includes("push"))).toEqual([
      expect.stringContaining("--dry-run"),
    ]);
    expect(commands.some((command) => command.includes("merge"))).toBe(false);
    expect(commands.some((command) => command.includes("pg_dump"))).toBe(false);
    expect(commands.some((command) => command === "pnpm build")).toBe(false);
    expect(readState(ctx.paths)?.upgradedAt).toBeUndefined();
  });

  it("backs up, applies the migrations and rebuilds", async () => {
    const { ctx, ran, printed } = installed(["20261128100000_install_status.sql"]);

    await upgrade(ctx, { dryRun: false, pull: false, backup: true, dbUrl: DB_URL });

    const commands = ran();
    const dump = commands.findIndex((command) => command.startsWith("pg_dump"));
    const push = commands.findIndex(
      (command) => command.includes("push") && command.includes("--yes"),
    );
    expect(dump).toBeGreaterThanOrEqual(0);
    expect(push).toBeGreaterThan(dump);
    // The password goes to pg_dump in its environment, not on its command line.
    expect(commands[dump]).not.toContain("db-password");
    expect(commands).toContain("pnpm build");
    expect(printed.join("\n")).not.toContain("db-password");
    expect(readState(ctx.paths)?.upgradedAt).toBe("2026-11-19T12:00:00.000Z");
  });

  it("does not pull over changes that are not committed", async () => {
    const root = makeRoot();
    const runner = fakeRunner();
    const run: typeof runner.run = (command, args, options) =>
      args[0] === "status"
        ? Promise.resolve({ code: 0, stdout: " M apps/web/page.tsx\n", stderr: "" })
        : runner.run(command, args, options);
    const { ctx } = makeContext(root, { run, prompt: unattendedPrompter() });
    writeState(ctx.paths, {
      mode: "cloud",
      appUrl: "https://support.example.com",
      installedAt: "2026-11-01T00:00:00.000Z",
    });

    await expect(upgrade(ctx, { dryRun: false, pull: true, dbUrl: DB_URL })).rejects.toThrow(
      "not committed",
    );
    expect(runner.calls.some((call) => call.args.includes("push"))).toBe(false);
  });

  it("asks for an install first", async () => {
    const { ctx } = makeContext(makeRoot());
    await expect(upgrade(ctx, { dryRun: true, pull: false })).rejects.toThrow("helpwren install");
  });
});

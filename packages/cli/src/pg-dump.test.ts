import { describe, expect, it } from "vitest";

import { type Runner } from "./exec.ts";
import { findPgDump, installHint, PG_DUMP_CANDIDATES, serverMajorFromMismatch } from "./pg-dump.ts";

const MISMATCH = `pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 17.12; pg_dump version: 15.12 (Homebrew)`;

/** Answers `--version` for the paths given, and fails for every other. */
function versions(installed: Record<string, string>): Runner {
  return (command) =>
    Promise.resolve(
      command in installed
        ? { code: 0, stdout: `pg_dump (PostgreSQL) ${installed[command]}\n`, stderr: "" }
        : { code: 127, stdout: "", stderr: "not found" },
    );
}

describe("finding a pg_dump new enough for the database", () => {
  it("reads the server's version from pg_dump's refusal", () => {
    expect(serverMajorFromMismatch(MISMATCH)).toBe(17);
    expect(serverMajorFromMismatch("connection refused")).toBeNull();
  });

  it("picks the newest installed pg_dump that is at least the server's version", async () => {
    const run = versions({
      "/opt/homebrew/opt/postgresql@17/bin/pg_dump": "17.6",
      "/opt/homebrew/opt/libpq/bin/pg_dump": "18.1",
      "/usr/local/opt/libpq/bin/pg_dump": "16.4",
    });
    await expect(findPgDump(run, 17)).resolves.toBe("/opt/homebrew/opt/libpq/bin/pg_dump");
  });

  it("finds none when every one installed is older than the server", async () => {
    const run = versions({ [PG_DUMP_CANDIDATES[0]]: "16.4" });
    await expect(findPgDump(run, 17)).resolves.toBeNull();
  });

  it("says what to install on each system", () => {
    expect(installHint(17, "darwin")).toContain("brew install libpq");
    expect(installHint(17, "linux")).toContain("postgresql-client-17");
  });
});

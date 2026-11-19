import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { dockerDatabaseUrl, placeholderKeys, supabaseServices } from "./docker.ts";
import { pathsFor } from "./state.ts";
import { makeRoot } from "./test-support.ts";

describe("supabaseServices", () => {
  it("is every service in the Compose file but Helpwren's own", async () => {
    const paths = pathsFor(makeRoot());
    const run = () =>
      Promise.resolve({ code: 0, stdout: "db\nhelpwren\nauth\nscheduler\nrealtime\n", stderr: "" });
    await expect(supabaseServices(run, paths)).resolves.toEqual(["db", "auth", "realtime"]);
  });
});

describe("placeholderKeys", () => {
  it("names the keys still at Supabase's published example", () => {
    const paths = pathsFor(makeRoot());
    mkdirSync(paths.supabaseSource, { recursive: true });
    writeFileSync(
      join(paths.supabaseSource, ".env.example"),
      "POSTGRES_PASSWORD=your-super-secret\nJWT_SECRET=example\n",
    );
    expect(
      placeholderKeys(paths, "POSTGRES_PASSWORD=your-super-secret\nJWT_SECRET=mine\n"),
    ).toEqual(["POSTGRES_PASSWORD"]);
  });
});

describe("dockerDatabaseUrl", () => {
  it("reaches the database through the pooler, with the tenant in the user", () => {
    const env = new Map([
      ["POSTGRES_PASSWORD", "p@ss/word"],
      ["POOLER_TENANT_ID", "helpwren-1"],
      ["POSTGRES_PORT", "5433"],
    ]);
    expect(dockerDatabaseUrl(env)).toBe(
      "postgresql://postgres.helpwren-1:p%40ss%2Fword@127.0.0.1:5433/postgres",
    );
  });
});

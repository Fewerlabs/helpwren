import { describe, expect, it } from "vitest";

import { atLeast, dockerChecks, nodeCheck, parseVersion } from "./prereqs.ts";
import { fakeRunner } from "./test-support.ts";

describe("versions", () => {
  it("finds the version in a program's output", () => {
    expect(parseVersion("Docker Compose version v2.39.2-desktop.1")).toEqual([2, 39, 2]);
    expect(parseVersion("git version 2.50")).toEqual([2, 50, 0]);
    expect(parseVersion("nothing here")).toBeNull();
  });

  it("compares part by part", () => {
    expect(atLeast([2, 39, 2], [2, 20])).toBe(true);
    expect(atLeast([2, 19, 9], [2, 20])).toBe(false);
    expect(atLeast([26, 0, 0], [26])).toBe(true);
  });

  it("asks for Node 26", () => {
    expect(nodeCheck("26.8.2").ok).toBe(true);
    const old = nodeCheck("24.1.0");
    expect(old.ok).toBe(false);
    expect(old.fix).toContain("nvm");
  });
});

describe("dockerChecks", () => {
  it("says how to start Docker when it is not running", async () => {
    const { run } = fakeRunner([], (call) => call.args[0] === "info");
    const [docker] = await dockerChecks(run);
    expect(docker).toMatchObject({ ok: false, found: "not running" });
    expect(docker?.fix).toContain("start it");
  });
});

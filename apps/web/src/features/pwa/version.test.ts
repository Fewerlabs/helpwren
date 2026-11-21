import { describe, expect, it } from "vitest";

import { healthVersionSchema, isNewVersion, workerUrl, workerVersion } from "./version";

describe("isNewVersion", () => {
  it("sees a different build as new, including a rollback", () => {
    expect(isNewVersion("0.1.0+3f2a9c1", "0.1.1+8b0d2e4")).toBe(true);
    expect(isNewVersion("0.1.1+8b0d2e4", "0.1.0+3f2a9c1")).toBe(true);
    expect(isNewVersion("0.1.0+3f2a9c1", "0.1.0+4c5d6e7")).toBe(true);
  });

  it("sees the same build as current", () => {
    expect(isNewVersion("0.1.0+3f2a9c1", "0.1.0+3f2a9c1")).toBe(false);
  });

  it("ignores a server that did not say", () => {
    expect(isNewVersion("0.1.0", undefined)).toBe(false);
    expect(isNewVersion("0.1.0", "")).toBe(false);
  });
});

describe("healthVersionSchema", () => {
  it("reads the version from the health check", () => {
    expect(healthVersionSchema.safeParse({ status: "ok", version: "0.1.0" }).data).toEqual({
      version: "0.1.0",
    });
    expect(healthVersionSchema.safeParse({ status: "error" }).success).toBe(false);
  });
});

describe("worker addresses", () => {
  it("carry the build, so each deploy is a new worker", () => {
    const url = workerUrl("0.1.0+3f2a9c1", false);
    expect(url).toBe("/sw.js?v=0.1.0%2B3f2a9c1");
    expect(workerVersion(`https://support.example.com${url}`)).toBe("0.1.0+3f2a9c1");
  });

  it("say when the build is a development one", () => {
    expect(workerUrl("0.1.0", true)).toBe("/sw.js?v=0.1.0&dev=1");
  });

  it("have no build when registered without one", () => {
    expect(workerVersion("https://support.example.com/sw.js")).toBeNull();
  });
});

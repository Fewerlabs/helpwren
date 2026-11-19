import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { mergeEnv, parseEnv, readEnvFile, writeEnvFile } from "./env-file.ts";

describe("parseEnv", () => {
  it("reads values, unquotes them and treats an empty value as unset", () => {
    const values = parseEnv("# comment\nA=1\nB=\"two words\"\nexport C='3'\nEMPTY=\n");
    expect(Object.fromEntries(values)).toEqual({ A: "1", B: "two words", C: "3" });
  });
});

describe("mergeEnv", () => {
  const start = "# Keep me\nA=old\nEMPTY=\nOTHER=untouched\n";

  it("keeps a value that is already set, and fills one that is empty", () => {
    const result = mergeEnv(start, { A: "new", EMPTY: "filled" });
    expect(result.text).toBe("# Keep me\nA=old\nEMPTY=filled\nOTHER=untouched\n");
    expect(result.kept).toEqual(["A"]);
    expect(result.written).toEqual(["EMPTY"]);
  });

  it("replaces set values only when asked", () => {
    expect(mergeEnv(start, { A: "new" }, { overwrite: true }).text).toContain("A=new");
    expect(mergeEnv(start, { A: "new" }, { replace: ["A"] }).text).toContain("A=new");
  });

  it("adds new keys at the end under a header", () => {
    const result = mergeEnv(start, { NEW: "x" }, { header: "Added" });
    expect(result.text.endsWith("OTHER=untouched\n\n# Added\nNEW=x\n")).toBe(true);
  });

  it("quotes values a reader could misread", () => {
    expect(mergeEnv("", { A: 'has space "and quotes"' }).text).toBe(
      'A="has space \\"and quotes\\""\n',
    );
  });

  it("can empty a placeholder, and then leaves the empty value alone", () => {
    const emptied = mergeEnv(
      "SMTP_USER=fake_mail_user\n",
      { SMTP_USER: "" },
      {
        replace: ["SMTP_USER"],
      },
    );
    expect(emptied.text).toBe("SMTP_USER=\n");
    expect(mergeEnv(emptied.text, { SMTP_USER: "" }).written).toEqual([]);
  });

  it("changes nothing when run again with the same values", () => {
    const once = mergeEnv(start, { EMPTY: "filled", NEW: "x" }).text;
    const twice = mergeEnv(once, { EMPTY: "filled", NEW: "x" });
    expect(twice.text).toBe(once);
    expect(twice.written).toEqual([]);
  });
});

describe("writeEnvFile", () => {
  it("writes a file only its owner can read", () => {
    const file = join(mkdtempSync(join(tmpdir(), "helpwren-env-")), "nested", ".env");
    writeEnvFile(file, "A=1\n");
    expect(readEnvFile(file)).toBe("A=1\n");
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type Context } from "./context.ts";
import { type RunOptions, type RunResult } from "./exec.ts";
import { type Choice, type Prompter, type TextOptions } from "./io.ts";
import { pathsFor } from "./state.ts";

export interface Call {
  command: string;
  args: readonly string[];
  options: RunOptions;
}

/** A copy of the parts of the repository the flows read, in a fresh folder. */
export function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "helpwren-cli-"));
  mkdirSync(join(root, "supabase", "templates"), { recursive: true });
  writeFileSync(join(root, "supabase", "templates", "sign-in-code.html"), "<p>{{ .Token }}</p>");
  return root;
}

/**
 * Stands in for every program the flows run. `db push` reports `pending` migrations on a dry
 * run; everything else succeeds quietly unless `fail` says otherwise.
 */
export function fakeRunner(pending: string[] = [], fail: (call: Call) => boolean = () => false) {
  const calls: Call[] = [];
  const run = (command: string, args: readonly string[], options: RunOptions = {}) => {
    const call = { command, args, options };
    calls.push(call);
    const ok = (stdout = ""): RunResult => ({ code: 0, stdout, stderr: "" });
    if (fail(call)) return Promise.resolve({ code: 1, stdout: "", stderr: "it broke" });
    if (args.includes("push")) {
      const listed = pending;
      // Once applied, they are no longer pending.
      if (!args.includes("--dry-run")) pending = [];
      return Promise.resolve(
        ok(JSON.stringify({ upToDate: listed.length === 0, migrations: listed, seeds: [] })),
      );
    }
    if (args[0] === "--version" || args.includes("--version"))
      return Promise.resolve(ok("12.21.0"));
    return Promise.resolve(ok());
  };
  return { run, calls };
}

/** Answers questions by a word in them. A question nobody expected fails the test. */
export function scriptedPrompter(answers: Record<string, string | boolean>): Prompter & {
  asked: string[];
} {
  const asked: string[] = [];
  const find = (question: string) => {
    asked.push(question);
    const key = Object.keys(answers).find((word) => question.includes(word));
    if (key === undefined) throw new Error(`Unexpected question: ${question}`);
    return answers[key];
  };
  return {
    asked,
    text: (question: string, { fallback }: TextOptions = {}) => {
      const answer = find(question);
      return Promise.resolve(answer === "" ? (fallback ?? "") : String(answer));
    },
    confirm: (question: string) => Promise.resolve(find(question) === true),
    select: <Value extends string>(question: string, _choices: readonly Choice<Value>[]) =>
      Promise.resolve(find(question) as Value),
  };
}

/** A context that records what it prints and talks to nothing real. */
export function makeContext(root: string, overrides: Partial<Context> = {}) {
  const printed: string[] = [];
  const record = (message: string) => {
    printed.push(message);
  };
  const ctx: Context = {
    paths: pathsFor(root),
    run: fakeRunner().run,
    prompt: scriptedPrompter({}),
    out: { step: record, info: record, ok: record, warn: record },
    fetch: () => Promise.resolve(new Response(null, { status: 200 })),
    now: () => new Date("2026-11-19T12:00:00Z"),
    ...overrides,
  };
  return { ctx, printed };
}

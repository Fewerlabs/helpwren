import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  /** `inherit` shows the command's own output; `capture` collects it for the caller. */
  stdio?: "inherit" | "capture";
  /** Written to the command's input, then closed. */
  input?: string;
  /** For `inherit`: a file the command's output goes to instead of the terminal. */
  stdoutFile?: string;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs other programs. The flows take one, so tests can stand in for Docker and Supabase. */
export type Runner = (
  command: string,
  args: readonly string[],
  options?: RunOptions,
) => Promise<RunResult>;

export const spawnRunner: Runner = (command, args, options = {}) => {
  const { cwd, env, stdio = "capture", input, stdoutFile } = options;
  // A backup holds every row of the database, so only its owner may read the file.
  const out = stdoutFile ? openSync(stdoutFile, "w", 0o600) : undefined;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: [
        input === undefined ? (stdio === "inherit" ? "inherit" : "ignore") : "pipe",
        out ?? (stdio === "inherit" ? "inherit" : "pipe"),
        stdio === "inherit" ? "inherit" : "pipe",
      ],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    if (input !== undefined) child.stdin?.end(input);
    // A program that is not installed is a failed check, not a crash.
    child.on("error", (error) => {
      resolve({ code: 127, stdout, stderr: stderr || error.message });
    });
    child.on("close", (code) => {
      if (out !== undefined) closeSync(out);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
};

/** A database address with its password replaced, for anything shown on screen. */
export function redactUrl(url: string): string {
  return url.replace(/(\/\/[^:/@]+:)[^@]+@/, "$1****@");
}

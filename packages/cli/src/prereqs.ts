import { type Runner } from "./exec.ts";

export interface Check {
  name: string;
  ok: boolean;
  /** What was found, such as a version. */
  found: string;
  /** How to put it right, when it is not. */
  fix: string;
}

/** The first `major.minor.patch` in a program's version output. */
export function parseVersion(text: string): [number, number, number] | null {
  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

/** Whether `found` is at least `wanted`, compared part by part. */
export function atLeast(found: readonly number[], wanted: readonly number[]): boolean {
  for (let index = 0; index < wanted.length; index += 1) {
    const have = found[index] ?? 0;
    const need = wanted[index] ?? 0;
    if (have !== need) return have > need;
  }
  return true;
}

async function versionCheck(
  run: Runner,
  name: string,
  command: string,
  args: readonly string[],
  wanted: readonly number[],
  fix: string,
  cwd?: string,
): Promise<Check> {
  const result = await run(command, args, cwd ? { cwd } : {});
  const version = result.code === 0 ? parseVersion(result.stdout + result.stderr) : null;
  if (!version) return { name, ok: false, found: "not found", fix };
  return { name, ok: atLeast(version, wanted), found: version.join("."), fix };
}

/** Node and pnpm, which every path needs: the installer and the migrations run on them. */
export function toolchainChecks(run: Runner, root: string): Promise<Check>[] {
  return [
    Promise.resolve(nodeCheck(process.versions.node)),
    versionCheck(
      run,
      "pnpm 12",
      "pnpm",
      ["--version"],
      [12],
      "Install it with `npm install --global pnpm@12`, or see https://pnpm.io/installation.",
    ),
    versionCheck(
      run,
      "Supabase CLI",
      "pnpm",
      ["exec", "supabase", "--version"],
      [2],
      "It comes with the repository: run `pnpm install` at the root.",
      root,
    ),
  ];
}

export function nodeCheck(version: string): Check {
  const parsed = parseVersion(version);
  return {
    name: "Node 26",
    ok: parsed !== null && atLeast(parsed, [26]),
    found: version,
    fix: "Install Node 26 (the version in .nvmrc), for example with `nvm install`.",
  };
}

/** Docker, running, with Compose v2.20 or later, which added `include`. */
export async function dockerChecks(run: Runner): Promise<Check[]> {
  const daemon = await run("docker", ["info", "--format", "{{.ServerVersion}}"]);
  const running: Check = {
    name: "Docker",
    ok: daemon.code === 0,
    found: daemon.code === 0 ? daemon.stdout.trim() : "not running",
    fix: "Install Docker (https://docs.docker.com/get-started/get-docker/) and start it.",
  };
  const compose = await versionCheck(
    run,
    "Docker Compose 2.20",
    "docker",
    ["compose", "version", "--short"],
    [2, 20],
    "Update Docker, or install the Compose plugin: https://docs.docker.com/compose/install/.",
  );
  const git = await versionCheck(
    run,
    "Git",
    "git",
    ["--version"],
    [2, 25],
    "Install Git 2.25 or later, for sparse checkouts: https://git-scm.com/downloads.",
  );
  return [running, compose, git];
}

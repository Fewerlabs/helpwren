import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

/** The two supported ways to run Helpwren. See https://helpwren.fewerlabs.dev/docs/get-started. */
export const installModeSchema = z.enum(["cloud", "docker"]);
export type InstallMode = z.infer<typeof installModeSchema>;

/**
 * What the installer remembers between runs, so `upgrade` knows how this copy was installed.
 * Nothing secret: keys and passwords stay in the env file.
 */
const stateSchema = z.object({
  mode: installModeSchema,
  appUrl: z.url(),
  installedAt: z.iso.datetime(),
  upgradedAt: z.iso.datetime().optional(),
});
export type InstallState = z.infer<typeof stateSchema>;

/** Where everything is, from the repository's root. */
export function pathsFor(root: string) {
  return {
    root,
    state: join(root, ".helpwren", "install.json"),
    backups: join(root, ".helpwren", "backups"),
    webEnv: join(root, "apps", "web", ".env.local"),
    dockerDir: join(root, "deploy", "docker"),
    dockerEnv: join(root, "deploy", "docker", ".env"),
    dockerCompose: join(root, "deploy", "docker", "docker-compose.yml"),
    supabaseSource: join(root, "deploy", "docker", "supabase"),
  };
}
export type Paths = ReturnType<typeof pathsFor>;

export function readState(paths: Paths): InstallState | null {
  if (!existsSync(paths.state)) return null;
  const parsed = stateSchema.safeParse(JSON.parse(readFileSync(paths.state, "utf8")));
  return parsed.success ? parsed.data : null;
}

export function writeState(paths: Paths, state: InstallState): void {
  mkdirSync(join(paths.root, ".helpwren"), { recursive: true });
  writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`);
}

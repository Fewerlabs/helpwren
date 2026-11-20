/**
 * Facts about this build, fixed when it was made. `next.config.ts` writes them in at build
 * time; they are not settings, so they are not in the environment schema.
 */
export const buildInfo = {
  /** The app's version and, where the build knew it, the commit: `0.1.0+3f2a9c1`. */
  version: process.env.HELPWREN_BUILD_VERSION ?? "development",
  /** The newest migration this build was made with: what the database should have reached. */
  schemaVersion: process.env.HELPWREN_BUILD_SCHEMA ?? null,
};

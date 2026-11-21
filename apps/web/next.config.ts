import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

import { BASE_HEADERS } from "./src/lib/security-headers";

const root = fileURLToPath(new URL("../..", import.meta.url));

/** The commit being built: from the host when it says (Vercel does), else from git. */
function commit(): string | undefined {
  const fromHost = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.HELPWREN_COMMIT;
  if (fromHost) return fromHost.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // A build from a source archive has no git history; the version alone will do.
    return undefined;
  }
}

const { version } = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")) as {
  version: string;
};
const sha = commit();
// Migration files start with their version, and sort in the order they apply.
const newestMigration = readdirSync(new URL("../../supabase/migrations", import.meta.url))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .at(-1)
  ?.split("_")[0];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Docker image runs Next's standalone server: only the files the app needs, no
  // node_modules tree. Other hosts build as usual. See apps/web/Dockerfile.
  ...(process.env.HELPWREN_STANDALONE === "1"
    ? { output: "standalone" as const, outputFileTracingRoot: root }
    : {}),
  // Read by `src/lib/build-info.ts` and reported by `/api/health`.
  env: {
    HELPWREN_BUILD_VERSION: sha ? `${version}+${sha}` : version,
    ...(newestMigration ? { HELPWREN_BUILD_SCHEMA: newestMigration } : {}),
  },
  // Next's own scripts, styles and fonts are served under /help, so a site that shows the help
  // center at its own /help with one rewrite of `/help/:path*` passes them on too. Under the
  // usual /_next they would be asked of that site, which does not have them.
  assetPrefix: "/help/_assets",
  // Bottom right, clear of the dashboard's sidebar. Development only.
  devIndicators: { position: "bottom-right" },
  transpilePackages: [
    "@helpwren/adapters",
    "@helpwren/core",
    "@helpwren/design-system",
    "helpwren",
  ],
  // The team's screens moved under /dashboard. Old addresses still work.
  redirects: () => [
    { source: "/inbox", destination: "/dashboard/inbox", permanent: true },
    { source: "/inbox/login", destination: "/login", permanent: true },
  ],
  // Collection icons on help center pages, under /help for the same reason as `assetPrefix`.
  // Before the pages, so `_icons` is never read as a collection.
  rewrites: () =>
    Promise.resolve({
      beforeFiles: [{ source: "/help/_icons/:path*", destination: "/api/icons/:path*" }],
      afterFiles: [],
      fallback: [],
    }),
  // The same on every response. The Content-Security-Policy, which depends on the install's
  // settings, is set per page by the proxy (src/proxy.ts).
  // The dashboard's service worker is checked for a new version on every visit, never served
  // from the HTTP cache.
  headers: () =>
    Promise.resolve([
      { source: "/:path*", headers: [...BASE_HEADERS] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ]),
  // The icon route reads Phosphor's SVG files from disk, so a deployment has to carry them.
  outputFileTracingIncludes: {
    "/api/icons/**": ["./node_modules/@phosphor-icons/core/assets/**/*.svg"],
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;

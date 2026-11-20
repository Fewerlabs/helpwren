// Builds a package for npm: one ES module per entry in `dist/lib`, with the package's
// dependencies and peers left as imports, and type declarations beside them.
//   node ../config/scripts/build-library.mjs src/index.ts src/bridge.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { build } from "esbuild";

const entryPoints = process.argv.slice(2);
if (entryPoints.length === 0) {
  console.error("Name the entry files to build, such as src/index.ts.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const external = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
].flatMap((name) => [name, `${name}/*`]);

rmSync("dist/lib", { recursive: true, force: true });

await build({
  entryPoints,
  outdir: "dist/lib",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2020",
  jsx: "automatic",
  external,
  logLevel: "warning",
});

execFileSync("tsc", ["--project", "tsconfig.build.json"], { stdio: "inherit" });

// The sources import `./protocol`, which a bundler resolves, but Node's own resolution of ES
// modules needs the file's full name. Every relative import here names a single file.
for (const file of readdirSync("dist/lib")) {
  if (!file.endsWith(".d.ts")) continue;
  const path = `dist/lib/${file}`;
  const text = readFileSync(path, "utf8").replace(
    /(from\s+|import\()(["'])(\.\.?\/[^"']+?)(?<!\.js)\2/g,
    "$1$2$3.js$2",
  );
  writeFileSync(path, text);
}

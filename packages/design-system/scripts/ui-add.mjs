// Adds or updates shadcn/ui components, then reapplies the mechanical edits this
// repository needs. Usage: pnpm ui:add <component...> [--overwrite]
//
// Icon imports are not rewritten here; see docs/design-system.md, "Updating ui components".
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SHADCN_VERSION = "4.23.0";
const root = fileURLToPath(new URL("..", import.meta.url));
const uiDir = fileURLToPath(new URL("../src/components/ui/", import.meta.url));

const components = process.argv.slice(2);
if (components.filter((argument) => !argument.startsWith("-")).length === 0) {
  console.error("Usage: pnpm ui:add <component...> [--overwrite]");
  process.exit(1);
}

execFileSync("pnpm", ["dlx", `shadcn@${SHADCN_VERSION}`, "add", ...components, "--yes"], {
  cwd: root,
  stdio: "inherit",
});

for (const file of readdirSync(uiDir).filter((name) => name.endsWith(".tsx"))) {
  const source = readFileSync(uiDir + file, "utf8");
  const fixed = source
    // Use our cn(), which knows the custom utilities in tokens/theme.css.
    .replaceAll('from "cn"', 'from "#lib/cn"')
    // The package's import map already adds the extension.
    .replaceAll(/(from "#components\/[^"]+)\.tsx"/g, '$1"');
  if (fixed !== source) {
    writeFileSync(uiDir + file, fixed);
  }
}

// The CLI installs upstream's `cn` package, which we replace with #lib/cn.
const manifest = JSON.parse(readFileSync(root + "package.json", "utf8"));
if (manifest.dependencies?.cn) {
  execFileSync("pnpm", ["remove", "cn"], { cwd: root, stdio: "inherit" });
}

const leftovers = readdirSync(uiDir).filter((name) =>
  readFileSync(uiDir + name, "utf8").includes("@phosphor-icons/react"),
);
if (leftovers.length > 0) {
  console.warn(`\nReplace the icon imports with <Icon> in: ${leftovers.join(", ")}`);
}

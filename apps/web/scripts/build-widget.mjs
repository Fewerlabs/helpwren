// Builds the widget script and puts it where the app serves it, at /widget.js. Runs before
// `next dev` and `next build`, so the app never serves a widget older than its own code.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

execFileSync("pnpm", ["--filter", "helpwren", "build"], { stdio: "inherit" });
mkdirSync(path("../public"), { recursive: true });
copyFileSync(path("../../../packages/widget/dist/widget.js"), path("../public/widget.js"));

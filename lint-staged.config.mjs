import path from "node:path";

const workspacePattern = /^(apps|packages)\/[^/]+/;

/**
 * ESLint rules resolve paths and dependencies from the working directory, so staged
 * files are grouped by workspace and each group is linted from inside its workspace.
 */
function eslintPerWorkspace(files) {
  const groups = new Map();
  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    const workspace = workspacePattern.exec(relative)?.[0] ?? ".";
    groups.set(workspace, [...(groups.get(workspace) ?? []), file]);
  }
  return [...groups].map(([workspace, group]) => {
    const quoted = group.map((file) => JSON.stringify(file)).join(" ");
    return `pnpm --dir ${workspace} exec eslint --fix --max-warnings=0 --no-warn-ignored ${quoted}`;
  });
}

/** @type {import("lint-staged").Configuration} */
export default {
  "*.{ts,tsx,js,mjs,cjs}": (files) => [
    `prettier --write ${files.map((file) => JSON.stringify(file)).join(" ")}`,
    ...eslintPerWorkspace(files),
  ],
  "*.{json,md,mdx,css,yml,yaml}": "prettier --write",
};

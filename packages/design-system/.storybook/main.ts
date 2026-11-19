import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig, type Plugin } from "vite";

// The app serves Phosphor's SVG files at /api/icons/{weight}/{name}.svg, and `CollectionIcon`
// draws from there. Storybook has no app behind it, so it serves the same paths from the
// package: every weight while it runs, and the regular weight (the one the stories show) as
// static files in a build. Kept in this file: Storybook warns about importing a sibling.
const require = createRequire(import.meta.url);
const icons = path.join(path.dirname(require.resolve("@phosphor-icons/core")), "../assets");
const ICON_ROUTE = /^\/api\/icons\/(thin|light|regular|bold|fill|duotone)\/([a-z0-9-]+)\.svg$/;

const phosphorIcons: Plugin = {
  name: "helpwren:phosphor-icons",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const [, weight, name] = ICON_ROUTE.exec(request.url ?? "") ?? [];
      if (!weight || !name) {
        next();
        return;
      }
      const file = weight === "regular" ? `${name}.svg` : `${name}-${weight}.svg`;
      readFile(path.join(icons, weight, file)).then(
        (svg) => {
          response.setHeader("Content-Type", "image/svg+xml");
          response.end(svg);
        },
        () => {
          response.statusCode = 404;
          response.end();
        },
      );
    });
  },
};

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  staticDirs: [{ from: path.join(icons, "regular"), to: "/api/icons/regular" }],
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { plugins: [tailwindcss(), phosphorIcons] }),
};

export default config;

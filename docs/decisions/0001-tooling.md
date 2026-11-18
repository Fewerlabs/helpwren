# 0001: Tooling and versions

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Helpwren starts as an empty repository. The tools below change often, so versions were taken from
the npm registry and setup steps from each tool's current documentation on the date above, not
from memory.

## Decision

A pnpm and Turborepo monorepo with one Next.js app, a design-system package and stub packages for
the product libraries.

### Versions

| Tool                                   | Version        | Notes                                           |
| -------------------------------------- | -------------- | ----------------------------------------------- |
| Node                                   | 26 (LTS)       | Pinned in `.nvmrc`                              |
| pnpm                                   | 12.21.0        | Pinned in `packageManager`                      |
| Turborepo                              | 2.11.12        |                                                 |
| Next.js                                | 16.4.6         | App Router, Turbopack                           |
| React                                  | 19.3.1         |                                                 |
| TypeScript                             | 6.0.3          | Not 7; see below                                |
| Tailwind CSS                           | 4.3.5          | CSS-first configuration                         |
| Zod                                    | 4.6.7          |                                                 |
| ESLint                                 | 9.39.5         | Not 10; see below                               |
| typescript-eslint                      | 8.73.0         | `strictTypeChecked` and `stylisticTypeChecked`  |
| eslint-plugin-import-x                 | 4.18.1         | Import ordering                                 |
| eslint-plugin-jsx-a11y                 | 6.10.2         | `strict` preset                                 |
| Prettier / prettier-plugin-tailwindcss | 3.10.1 / 0.8.1 |                                                 |
| Vitest                                 | 5.1.1          | jsdom 31 for unit tests                         |
| Testing Library (React)                | 16.3.3         |                                                 |
| Storybook                              | 10.6.7         | `@storybook/react-vite`, a11y and Vitest addons |
| Vite                                   | 8.3.8          | Used by Storybook and Vitest                    |
| Playwright                             | 1.65.1         | Browser for story tests; e2e tests come later   |
| Husky / lint-staged                    | 9.1.7 / 17.6.1 |                                                 |
| commitlint                             | 21.2.4         | Conventional Commits                            |
| Changesets                             | 3.0.3          |                                                 |

Libraries the design system will add in later phases, with the versions current on the same date:
shadcn CLI 4.23.0, Zustand 5.1.0, React Hook Form 7.92.0, `@hookform/resolvers` 7.0.7,
class-variance-authority 0.7.1, `@phosphor-icons/react` 2.1.10.

### Documentation followed

- Turborepo, configuring tasks: https://turborepo.dev/docs/crafting-your-repository/configuring-tasks
- pnpm settings (`pnpm-workspace.yaml`, catalogs, `allowBuilds`): https://pnpm.io/settings
- shadcn/ui monorepo setup: https://ui.shadcn.com/docs/monorepo
- shadcn/ui `components.json`: https://ui.shadcn.com/docs/components-json
- Next.js `optimizePackageImports`: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
- Storybook for Next.js with Vite: https://storybook.js.org/docs/get-started/frameworks/nextjs-vite
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon

### Choices that differ from "latest"

- **TypeScript 6.0, not 7.0.** typescript-eslint 8.73 declares support for TypeScript below 6.1.
  Type-aware linting is a core part of the quality bar, so TypeScript stays on 6 until
  typescript-eslint supports 7.
- **ESLint 9, not 10.** `eslint-plugin-jsx-a11y` 6.10.2 declares support up to ESLint 9.
  Accessibility linting is required, so ESLint stays on 9 until the plugin supports 10.
- **`@next/eslint-plugin-next` directly, not `eslint-config-next`.** The bundled config brings
  `eslint-plugin-import`, which would duplicate `eslint-plugin-import-x`. We compose the Next.js
  plugin with our own React, hooks and accessibility configuration instead.
- **`@storybook/react-vite`, not `@storybook/nextjs-vite`.** Storybook lives in the design-system
  package, which is a React library and not a Next.js app.

### Other choices

- **Internal packages are consumed as source.** Each package's `exports` point at `src`, and the
  app compiles them through `transpilePackages`. This avoids a build step and watch processes
  while nothing is published. A package gets a real build when it is first published.
- **Shared versions use a pnpm catalog** in `pnpm-workspace.yaml`, so React, TypeScript, ESLint,
  Vitest and similar are bumped in one place.
- **Dependency install scripts are blocked by default.** Only packages listed under `allowBuilds`
  in `pnpm-workspace.yaml` may run them.
- **No JavaScript Tailwind preset.** Tailwind v4 is configured in CSS, so the theme lives in the
  design system's stylesheet rather than in `packages/config`.
- **No automatic dependency updates for now.** Dependabot was set up at first and then switched
  off while the project is in early development: it opened a pull request per update, and work
  goes straight to `main`. Turn it back on before the first release.
- **Every package is `private`** until the npm names are claimed.

## Consequences

- Two tools are one major version behind. Revisit when typescript-eslint supports TypeScript 7
  and `eslint-plugin-jsx-a11y` supports ESLint 10.
- Contributors need pnpm 12 and Node 26.
- Publishing a package later means adding a build for it and changing its `exports`.

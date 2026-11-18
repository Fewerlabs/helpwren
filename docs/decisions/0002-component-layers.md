# 0002: Three component layers

- **Status:** accepted
- **Date:** 2026-11-18

## Context

The design system uses shadcn/ui, whose components are copied into the repository rather than
installed. That makes them easy to restyle and easy to let drift: once edited freely, upstream
fixes can no longer be pulled in with the CLI. Helpwren also needs its own component API and brand,
and adopters need to restyle the widget through tokens without copying components.

## Decision

Components in `packages/design-system/src/components` are split into three layers.

| Layer    | Holds                                                             | May import       |
| -------- | ----------------------------------------------------------------- | ---------------- |
| `ui`     | shadcn/ui output. Restyled only through tokens                    | `lib`            |
| `base`   | Our primitives: our API, variants and styles. Wraps `ui` or Radix | `ui`, `lib`      |
| `shared` | Composed, reusable pieces                                         | `base`, `shared` |

Rules:

- Only `base` imports from `ui`. `ui` stays close to upstream so the shadcn CLI can update it.
- Everything outside the design system uses `base` and `shared`, never `ui`. The package's public
  entry point does not export `ui`.
- `shared` has no business logic, no data fetching and no stores.
- Icons are used only through the `Icon` base component. Only its registry imports the icon
  library.
- Feature code in apps imports from `@helpwren/design-system` only.

The boundaries are enforced with ESLint `no-restricted-imports` in
`packages/design-system/eslint.config.mjs`.

## Consequences

- A component that shadcn provides exists twice, as a `ui` file and a `base` wrapper. That is the
  cost of being able to take upstream updates.
- Any edit to a `ui` file that is not a token change, such as replacing an icon import, must be
  recorded in `docs/design-system.md` so it can be reapplied after an update.
- Our component API is ours. Replacing shadcn or Radix under a `base` component does not change
  what feature code imports.

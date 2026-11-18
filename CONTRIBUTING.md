# Contributing to Helpwren

Thank you for helping. This page covers what you need to make a change; the longer guides are in
[`docs/contributing/`](docs/contributing/).

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md). Report security
problems privately, as described in [SECURITY.md](SECURITY.md).

## Setup

You need Node 26 (`nvm use` reads `.nvmrc`) and pnpm 12.

```bash
pnpm install
pnpm exec playwright install chromium
```

More detail: [docs/contributing/setup.md](docs/contributing/setup.md).

## Everyday commands

| Command          | Does                                    |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Runs the app on http://localhost:3000   |
| `pnpm storybook` | Runs Storybook on http://localhost:6006 |
| `pnpm lint`      | ESLint in every package                 |
| `pnpm typecheck` | TypeScript in every package             |
| `pnpm test`      | Unit tests and Storybook story tests    |
| `pnpm build`     | Builds the app and the static Storybook |
| `pnpm format`    | Formats everything with Prettier        |
| `pnpm check`     | Everything CI runs, in one command      |

## Branches and commits

- Branch from `main`. Name the branch after the change, for example `feat/status-chip` or
  `fix/dialog-focus`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): summary`, for example `feat(design-system): add StatusChip`. A commit hook checks
  the message. Common types are `feat`, `fix`, `docs`, `refactor`, `test`, `chore` and `ci`.
- A pre-commit hook formats and lints the files you staged.
- Keep pull requests small and about one thing.

## Code conventions

The rules are short and enforced by lint where possible. See
[docs/contributing/conventions.md](docs/contributing/conventions.md) and
[docs/architecture.md](docs/architecture.md). In brief:

- TypeScript strict. No `any`, no dead or commented-out code, no `eslint-disable` without a reason
  written beside it.
- Zod at every external boundary; types are inferred from schemas.
- Feature code imports UI from `@helpwren/design-system` only.

## Adding a component

Components live in `packages/design-system` in three layers: `ui` (shadcn output), `base` (our
primitives) and `shared` (composed pieces). Every component needs typed props, a story, a test and
a short entry in [docs/design-system.md](docs/design-system.md). The steps are in
[docs/design-system.md](docs/design-system.md#adding-a-component).

## Adding a changeset

If your change affects a package, add a changeset so it appears in that package's changelog:

```bash
pnpm changeset
```

Pick the packages, pick the bump (patch for fixes, minor for features, major for breaking
changes) and write one or two sentences for someone reading the changelog. Commit the generated
file with your change. See [docs/contributing/releasing.md](docs/contributing/releasing.md).

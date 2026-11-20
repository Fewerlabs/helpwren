# Contributing

Help build Helpwren: report a problem, improve these docs, or send a change.

Helpwren is MIT licensed and developed in the open on
[GitHub](https://github.com/Fewerlabs/helpwren). By taking part you agree to follow the
[code of conduct](../../CODE_OF_CONDUCT.md). Report security problems privately, as the
[security policy](../../SECURITY.md) describes.

## Ways to help

- **Report a bug or ask for a feature** in the
  [issues](https://github.com/Fewerlabs/helpwren/issues). Say what you ran, what you expected and
  what happened.
- **Improve the docs.** Every page here is a Markdown file in the repository's `docs/` folder;
  **Edit on GitHub** at the foot of each page opens it.
- **Send a change.** Start with [Development setup](setup.md), follow the
  [conventions](conventions.md), and read [CONTRIBUTING.md](../../CONTRIBUTING.md) for branches,
  commits and changesets.

## Before you open a pull request

```bash title="Terminal"
pnpm check
```

This runs the format check, lint, typecheck, tests and build, which is what CI runs.

## How the code is organised

- [Architecture](../architecture.md): the monorepo, the app, the database and the widget.
- [Decision records](../decisions/README.md): why things are the way they are.
- [Design system](../design-system.md): tokens, components and illustrations.
- [Timing a fresh install](timing-an-install.md): the install times to check before a release.

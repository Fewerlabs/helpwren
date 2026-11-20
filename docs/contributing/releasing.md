# Release process

Helpwren uses [Changesets](https://github.com/changesets/changesets) for versions and changelogs,
and a tag for each release of the product.

## What is released

| What                       | Where                                   | Version                       |
| -------------------------- | --------------------------------------- | ----------------------------- |
| The product (app and data) | A `vX.Y.Z` tag and a GitHub release     | `apps/web/package.json`       |
| `helpwren` (the widget)    | npm                                     | its own, from changesets      |
| `@helpwren/react-native`   | npm                                     | its own, from changesets      |
| Everything else            | Not published; used inside the monorepo | versioned, for the changelogs |

An install upgrades by pulling the new code and running `pnpm helpwren upgrade`, so the tag is
what self-hosters follow. The app's version is what `/api/health` reports.

## While you work

Add a changeset to any change to a package:

```bash
pnpm changeset
```

- **patch:** a fix that does not change the API
- **minor:** a new feature that does not break existing use
- **major:** a breaking change

Write the summary for the person reading the changelog: what changed and what they need to do.
`@helpwren/config` and `@helpwren/web` are not versioned by changesets and need none.

## Cutting a release

1. On an up-to-date `main` with the full suite green (see [setup.md](setup.md#check-your-work)):

   ```bash
   pnpm version-packages
   ```

   This consumes the pending changesets, bumps the packages and writes each `CHANGELOG.md`.
   Read the entries for the published packages and fix any that would confuse someone outside
   the project.

2. Set the product version in `apps/web/package.json`, and add a section for it to
   [CHANGELOG.md](../../CHANGELOG.md) at the top level: what a self-hoster gets, and any step
   the upgrade needs.

3. Commit as `chore: release vX.Y.Z`, tag and push:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main vX.Y.Z
   ```

The tag starts the [release workflow](../../.github/workflows/release.yml). It checks the tag
matches the app's version, runs the checks, publishes every public package whose version is not
on npm yet (with provenance), and creates the GitHub release from that version's section of
`CHANGELOG.md`.

## One-time setup

- **npm:** two organisations. `fewerlabs` owns the unscoped `helpwren` package, and `helpwren`
  owns the `@helpwren` scope, so `@helpwren/react-native` and later packages can be published.
  Give the same maintainers access to both. For the first release, make an automation token
  from an account in both and add it as the repository secret `NPM_TOKEN`. Once both packages
  exist, set up [trusted publishing](https://docs.npmjs.com/trusted-publishers) for
  `release.yml` on each, then delete the token.
- **GitHub:** the workflow uses the built-in `GITHUB_TOKEN`; nothing to add.

## If something goes wrong

- A failed publish can be retried by re-running the workflow: versions already on npm are
  skipped.
- A published version cannot be replaced. Fix forward with a patch release, and
  `npm deprecate helpwren@X.Y.Z "reason"` if the bad one should not be used.

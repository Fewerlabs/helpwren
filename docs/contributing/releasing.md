# Release process

Helpwren uses [Changesets](https://github.com/changesets/changesets) for versions and changelogs.

> Nothing is published yet. Every package is marked `private` until the npm names are claimed. The steps below already produce versions and changelogs; publishing will be
> added to them later.

## While you work

Add a changeset to any pull request that changes a package:

```bash
pnpm changeset
```

- **patch:** a fix that does not change the API
- **minor:** a new feature that does not break existing use
- **major:** a breaking change

Write the summary for the person reading the changelog: what changed and what they need to do.

`@helpwren/config` and `@helpwren/web` are not versioned and do not need changesets.

## Cutting a version

```bash
pnpm version-packages
```

This consumes the pending changesets, bumps the affected package versions and writes each
package's `CHANGELOG.md`. Review the result and commit it as `chore: version packages`.

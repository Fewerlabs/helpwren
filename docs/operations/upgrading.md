# Upgrading

Move an install to a new version of Helpwren, with a backup taken first.

## Before you start

- The checkout you installed from, with no uncommitted changes.
- On Supabase Cloud, `pg_dump` on your machine if you want the upgrade to back up the database.
- Read the [changelog](../../CHANGELOG.md) for the versions you are moving across.

## Upgrade

1. See what the upgrade would do. This changes nothing:

   ```bash title="Terminal"
   pnpm helpwren upgrade --dry-run
   ```

2. Run it:

   ```bash title="Terminal"
   pnpm helpwren upgrade
   ```

3. On Supabase Cloud, redeploy the app. Vercel deploys on every push; push the new version to the
   branch it builds from.
4. Check [`/api/health`](health-check.md): it answers `"migrations": "current"` when the database
   has every migration the running build expects.

The upgrade:

1. pulls the new version with a fast-forward `git pull`, refusing if you have uncommitted
   changes, then runs `pnpm install`;
2. lists the migrations the database has not had yet (`supabase db push --dry-run`);
3. asks to back up the database first and, with your yes, saves a `pg_dump` to
   `.helpwren/backups/`. With Docker it dumps from the `db` container; on Cloud it needs
   `pg_dump` on your machine, and otherwise reminds you to check the project's backups;
4. applies the migrations;
5. rebuilds: with Docker it rebuilds and restarts the app and scheduler containers; on Cloud it
   runs `pnpm build`.

| Flag                      | What it does                                                               |
| ------------------------- | -------------------------------------------------------------------------- |
| `--dry-run`               | Shows what would happen and changes nothing                                |
| `--no-pull`               | Uses the code already checked out                                          |
| `--backup`, `--no-backup` | Backs up the database first, or not, without asking                        |
| `--db-url`                | The connection string for the migrations. Also read from `SUPABASE_DB_URL` |
| `--yes`                   | Asks nothing, for CI                                                       |

If something goes wrong, see [Backups and rolling back](backups.md).

## Upgrade the self-hosted Supabase stack

Moving Docker's Supabase stack to a new Supabase release is a separate, deliberate step:

1. Read Supabase's [self-hosting changelog](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md).
2. Change `SUPABASE_SELF_HOSTED_REF` in `packages/cli/src/docker.ts`.
3. Move `deploy/docker/supabase` aside and run `pnpm helpwren install --mode docker` again.

Data lives in named volumes, so fetching the new files never touches it.

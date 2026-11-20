# Backups and rolling back

Keep copies of the database, and restore one to go back to an earlier version.

## Backups

- **Supabase Cloud**: Supabase takes daily backups on paid plans, under **Database → Backups**
  in its dashboard. The free plan has none, so take your own.
- **Docker**: the database lives in the `helpwren_db-data` volume and uploads in
  `helpwren_storage-data`. Back up both on your own schedule.
- **Before an upgrade**: `pnpm helpwren upgrade` offers to save a `pg_dump` to
  `.helpwren/backups/` first. See [Upgrading](upgrading.md).

To take a backup by hand:

```bash title="Terminal"
# Docker, from deploy/docker
docker compose exec -T db pg_dump --username=postgres --format=custom postgres > helpwren.dump
# Supabase Cloud
pg_dump --format=custom --no-owner --dbname="$SUPABASE_DB_URL" > helpwren.dump
```

## Roll back an upgrade

Migrations only move forward, so rolling back means restoring the backup taken before the
upgrade, then running the older code.

1. **Stop traffic.** Stop the app with `docker compose stop helpwren scheduler`, or pause the
   deployment on your host.
2. **Restore the database** from the backup the upgrade printed:

   ```bash title="Terminal"
   # Docker, from deploy/docker
   docker compose exec -T db pg_restore --username=postgres --dbname=postgres --clean --if-exists \
     < ../../.helpwren/backups/helpwren-<time>.dump
   # Supabase Cloud: from Database → Backups in the dashboard, or
   pg_restore --clean --if-exists --no-owner --dbname="$SUPABASE_DB_URL" .helpwren/backups/helpwren-<time>.dump
   ```

3. **Go back to the old code.** Run `git checkout <previous tag or commit>`, then
   `docker compose up --detach --build helpwren scheduler`, or redeploy that commit on your
   host.
4. **Check** that [`/api/health`](health-check.md) answers `"migrations": "current"`.

> [!WARNING]
> Restoring replaces everything written since the backup, including conversations from the
> time between the upgrade and the rollback.

# Health check

Check that an install is running, can reach its database and has every migration it needs.

```bash title="Terminal"
curl https://support.example.com/api/health
```

```json title="200 OK"
{
  "status": "ok",
  "version": "0.1.0+e7320c6",
  "database": "ok",
  "schemaVersion": "20261122100000",
  "expectedSchemaVersion": "20261122100000",
  "migrations": "current"
}
```

| Field                   | Values                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `status`                | `ok`, or `error` when the database cannot be reached                                            |
| `version`               | The release and commit this build came from, such as `0.1.0+e7320c6`                            |
| `database`              | `ok` or `unreachable`                                                                           |
| `schemaVersion`         | The newest migration the database has had                                                       |
| `expectedSchemaVersion` | The newest migration this build expects                                                         |
| `migrations`            | `current` when they match, `pending` when the database is behind, `unknown` when it cannot tell |

It answers `200` while the database answers, and `503` when it does not. It is never cached.

## Use it

- **Uptime monitoring**: point your monitor at `/api/health` and alert on anything but `200`.
- **After an upgrade**: check for `"migrations": "current"`. `pending` means the build is newer
  than the database; run the migrations. See [Upgrading](upgrading.md).
- **Docker**: the image's health check calls it, so `docker compose ps` shows the container as
  unhealthy when the database cannot be reached.

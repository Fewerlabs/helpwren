# Environment variables

Every variable the app reads, and where to set each one.

The app checks them all when it starts, and stops with a message naming any that is missing or
malformed. Locally they live in `apps/web/.env.local`; on a host, in its environment settings.
[`.env.example`](../../.env.example) lists them with comments.

> [!IMPORTANT]
> `NEXT_PUBLIC_` values are written into the browser's code at build time. Build where they are
> set, and rebuild after changing one.

## The app

| Variable                               | Required | What it is                                                                                                                                                      |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | Yes      | The install's public address, such as `https://support.example.com`. Used in links, canonical addresses and the widget snippet. Default `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes      | The Supabase project's URL                                                                                                                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase's publishable key. Safe in the browser: the access rules decide what it can do                                                                         |
| `SUPABASE_SECRET_KEY`                  | Yes      | Supabase's secret key, which bypasses the access rules. Server only; never give it a `NEXT_PUBLIC_` name                                                        |
| `EMAIL_PROVIDER`                       | No       | `smtp` or `resend`. Unset sends no email. See [Sending email](../email/index.md)                                                                                |
| `SMTP_URL`                             | No       | For `smtp`: the server and sign-in, such as `smtps://user:password@smtp.example.com:465`                                                                        |
| `RESEND_API_KEY`                       | No       | For `resend`: an API key that may send. Also reads [replies by email](../email/replies.md) from Resend                                                          |
| `CRON_SECRET`                          | No       | At least 16 characters. Unset turns the [scheduled jobs](scheduled-jobs.md) off                                                                                 |
| `RATE_LIMIT_STORE`                     | No       | `database` (default) shares rate limit counts between every copy of the app; `memory` keeps one per process                                                     |
| `CLIENT_IP_HEADER`                     | No       | The header holding the visitor's address; its last entry is used. Default `x-forwarded-for`. Behind Cloudflare: `cf-connecting-ip`                              |
| `TURNSTILE_SECRET_KEY`                 | No       | Cloudflare Turnstile's secret key, for the [captcha](../security/index.md#captcha)                                                                              |
| `SUPABASE_INTERNAL_URL`                | No       | Where the server reaches Supabase when that is not the public address, such as `http://kong:8000` beside a self-hosted Supabase. Docker Compose sets it         |

## The installer

`pnpm helpwren install` and `upgrade` also read these, in place of flags:

| Variable                | Flag             |
| ----------------------- | ---------------- |
| `HELPWREN_MODE`         | `--mode`         |
| `SUPABASE_DB_URL`       | `--db-url`       |
| `SUPABASE_ACCESS_TOKEN` | `--access-token` |
| `CI`                    | `--yes`          |

## Docker Compose

With Docker, set Helpwren's values in `deploy/docker/.env`. The Compose file passes them to the
app under the names above:

| In `deploy/docker/.env` | Becomes                                         |
| ----------------------- | ----------------------------------------------- |
| `HELPWREN_APP_URL`      | `NEXT_PUBLIC_APP_URL`                           |
| `HELPWREN_PORT`         | The port Helpwren is published on. Default 3000 |
| `HELPWREN_SMTP_URL`     | `SMTP_URL`                                      |
| `EMAIL_PROVIDER`        | `EMAIL_PROVIDER`                                |
| `RESEND_API_KEY`        | `RESEND_API_KEY`                                |
| `CRON_SECRET`           | `CRON_SECRET`, also given to the scheduler      |

The Supabase variables come from Supabase's own values in the same file. To set any other
variable, such as `TURNSTILE_SECRET_KEY`, add it to the `helpwren` service's `environment` in
`deploy/docker/docker-compose.yml`.

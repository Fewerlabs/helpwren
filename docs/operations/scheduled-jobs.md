# Scheduled jobs

Call two jobs every minute to send emails and pushes that are due.

| Job                    | Sends                                       | Answers                                     |
| ---------------------- | ------------------------------------------- | ------------------------------------------- |
| `POST /api/jobs/email` | Unread replies and ticket changes, by email | `{ sent, skipped, failed }`                 |
| `POST /api/jobs/push`  | Replies, as push notifications to phones    | `{ sent, skipped, failed, removedDevices }` |

Each call needs `Authorization: Bearer <CRON_SECRET>`. Without `CRON_SECRET` set, the jobs answer
`404` and do nothing; with a wrong secret, `401`. They accept only `POST`.

With Docker Compose, the `scheduler` container already calls both every minute. On any other
host, set it up yourself.

## Set a secret

`pnpm helpwren install` writes one to `apps/web/.env.local`. To make one by hand, use at least 16
characters:

```bash title="Terminal"
openssl rand -hex 32
```

Set it as `CRON_SECRET` in the app's environment.

## Call the jobs

Any scheduler that can make an HTTP request every minute works: the host's cron, a GitHub
Actions schedule, or an uptime monitor.

```bash title="Terminal"
curl -X POST https://support.example.com/api/jobs/email -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://support.example.com/api/jobs/push -H "Authorization: Bearer $CRON_SECRET"
```

> [!WARNING]
> Vercel Cron Jobs call with `GET`, and on the Hobby plan at most once a day, so they cannot run
> these jobs. Use another scheduler.

### From the database

Supabase can call them itself with `pg_cron` and `pg_net`. Run this once in the Supabase SQL
editor, with your own address and secret:

```sql title="Supabase SQL editor"
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('helpwren-email', '* * * * *', $$
  select net.http_post(
    url := 'https://support.example.com/api/jobs/email',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
$$);
select cron.schedule('helpwren-push', '* * * * *', $$
  select net.http_post(
    url := 'https://support.example.com/api/jobs/push',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
$$);
```

## On Supabase's free plan

Supabase pauses a free project after about a week with little activity, and the chat is down
until someone restores it from the Supabase dashboard. Nothing is lost, but visitors cannot write
in the meantime.

Every run of a job asks the database for work, so a scheduler calling them every minute keeps the
project active. Supabase does not publish exactly what counts as activity, so treat this as very
likely rather than guaranteed.

- **With the scheduler running**, as every install that sends email or push should, nothing more
  is needed.
- **Without one**, such as a trial install, call either job once a day from any scheduler.
- **For a business's support desk**, use Supabase's Pro plan: projects are never paused, and it
  adds daily backups.

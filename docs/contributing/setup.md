# Setup

This page is for working on Helpwren. To install it for real use, see
[Installing Helpwren](../install.md).

## Requirements

- **Node 26** (the current LTS). The version is pinned in `.nvmrc`; run `nvm use` or the
  equivalent for your version manager.
- **pnpm 12.** The exact version is pinned in the root `package.json` (`packageManager`). Install
  it with `npm install --global pnpm@12`, or follow the
  [pnpm installation guide](https://pnpm.io/installation).
- **Docker**, for the local database. [Docker Desktop](https://docs.docker.com/desktop/) is the
  easiest option on macOS and Windows; any Docker-compatible runtime works. It must be running
  whenever you use the `db:` commands below.

## Install

```bash
pnpm install
pnpm exec playwright install chromium
```

Chromium is used to run Storybook stories as tests. It is a one-time download.

## Environment variables

The app needs to know where its Supabase project is. With the local database running, this
writes `apps/web/.env.local` for you:

```bash
pnpm db:env
```

To point at another project, copy `.env.example` to `apps/web/.env.local` and fill it in. Every
variable is validated at startup by the Zod schema in `apps/web/src/lib/env.ts`.

## Run

```bash
pnpm dev          # http://localhost:3000
pnpm storybook    # http://localhost:6006
```

## Local database

Helpwren runs on Supabase. The Supabase CLI is a dev dependency, so `pnpm install` brings it, and
it runs the whole stack (Postgres, Auth, Realtime, Storage and a test mailbox) in Docker on your
machine. No Supabase account is needed for development.

```bash
pnpm db:start     # start the stack; the first run downloads the images and takes a while
pnpm db:status    # print the local URLs and keys
pnpm db:reset     # rebuild the database from supabase/migrations and the seed data
pnpm db:stop      # stop the stack and keep its data
pnpm db:env       # write apps/web/.env.local for the local stack
pnpm db:test      # run the access-rule tests in supabase/tests
pnpm test:db      # run the tests that need the database: the client library and API routes
pnpm test:e2e     # run the browser tests in apps/web/e2e against the local stack
pnpm db:lint      # check the schema for mistakes
pnpm db:types     # regenerate packages/core/src/database.types.ts after a schema change
```

`pnpm db:reset` loads demo data from `supabase/seed.sql`: two team members (`ada@example.com`, an
admin, and `sam@example.com`), a few contacts and some conversations.

### Trying the chat

Open http://localhost:3000/embed. It is the visitor's side, sized for a phone or the widget's
frame. The demo data asks guests for a name and an email or phone number; change the
`guest_details` row in the `settings` table to `"email"`, `"phone"` or `"none"` to see the others.

To see it as a site's visitor would, through the widget:

```bash
node examples/plain-html/serve.mjs
```

Then open http://127.0.0.1:4100.

### Signing in to the dashboard

Open http://localhost:3000/dashboard and enter one of the demo emails. The six-digit code arrives in
Mailpit, the local test mailbox, at http://127.0.0.1:54324. Keep `/embed` open in another
window to write as a visitor and see both sides update live. Ada is an admin and can add team members under Settings, then Team. On an install with no admin
yet, open http://localhost:3000/setup to create the first one, or add them from the command line:

```bash
pnpm agent:invite you@example.com --name "Your Name" --admin
```

`pnpm db:status` also prints the address of Supabase Studio, a browser interface for the local
database, and of Mailpit, which catches every email the local stack sends. Local settings live in
`supabase/config.toml`.

## Email

Email is off until a provider is set. Add one of these to `apps/web/.env.local`, restart the
app, then set a from address under Settings → Email and press "Send a test email".

```bash
# Any SMTP server
EMAIL_PROVIDER=smtp
SMTP_URL=smtps://user:password@smtp.example.com:465

# Or Resend
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
```

### Sending what is due

Replies a contact has not read, and changes to a ticket's status, are emailed by a job that has
to be called every minute, and replies are pushed to phones by another (see
[the mobile guide](../mobile.md)). Set a secret, then have any scheduler call both jobs with it:

```bash
# apps/web/.env.local
CRON_SECRET=<output of: openssl rand -hex 32>
```

```bash
curl -X POST https://support.example.com/api/jobs/email -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://support.example.com/api/jobs/push -H "Authorization: Bearer $CRON_SECRET"
```

Your host's cron, a GitHub Actions schedule or an uptime pinger all work. To have the database
do it, run this once in the Supabase SQL editor with your own address and secret:

```sql
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

### Replies by email

Contacts can answer an email from their mail app, and the answer lands in the conversation. Turn
it on under Settings → Email → Replies by email: a reply address on a domain your provider
receives mail for (say `reply@support.example.com`), the provider, and its secret. The page
shows the webhook address to paste into the provider and a checklist for each one:

- **Resend:** add the domain in Resend, turn on receiving and add its MX record; add a webhook for
  `email.received`; paste its signing secret. Replies are read through Resend's API, with the
  server's `RESEND_API_KEY` or a key saved on the page.
- **Postmark:** point the domain's MX record at `inbound.postmarkapp.com` and set it as the
  inbound domain; make a secret on the page and paste the webhook address, which carries it.
- **Anything else:** make a secret and have your provider or bridge post each email as JSON,
  signed like the sample on the page.

IMAP polling, for any mailbox, is not built yet.

To try it locally without a provider, choose "Another provider", make a secret, and save. Start a
chat as a visitor with an email address, reply from the inbox, and post the visitor's answer as
the provider would. The reply address is the `Reply-To` of the email the visitor is sent, so set
up any provider for sending (an SMTP test inbox will do) and copy that `reply+…` address into
`TO`:

```bash
SECRET='whsec_…'   # shown once, when you made it
TO='reply+<token>@support.example.com'
BODY=$(jq -nc --arg to "$TO" '{
  from: "Visitor <visitor@example.org>",
  to: [$to],
  subject: "Re: New reply",
  text: "Thanks!\n\nOn Wed, 19 Nov 2026, Support <\($to)> wrote:\n> Your earlier reply",
  messageId: "<try-1@example.org>"
}')
T=$(date +%s)
SIG=$(printf '%s.%s' "$T" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')
curl -X POST http://localhost:3000/api/email/inbound/generic \
  -H 'Content-Type: application/json' -H "helpwren-signature: t=$T,v1=$SIG" -d "$BODY"
```

The answer is `{"outcome":"added"}`, and "Thanks!" shows in the inbox marked "via email". Post it
again and the answer is `duplicate`; change the token and it is `ignored`, with the reason in the
app's log.

### On Supabase's free plan

Supabase pauses a free project after about a week with little activity, and the chat is down
until someone restores it from the Supabase dashboard. Nothing is lost, but visitors cannot
write in the meantime.

The jobs above keep an install awake: every run asks the database for work, whether or not
there is any, and a scheduler calls them every minute. Supabase does not publish exactly what
counts as activity, so treat this as very likely rather than promised.

- **With the scheduler running**, as every install that sends email or push should, you need
  nothing more.
- **Without one**, for example a trial install or a quiet stretch before launch, call either job
  once a day from any scheduler (a cron job, a GitHub Actions schedule or a free service such as
  cron-job.org). `CRON_SECRET` must be set, or the job answers "Not found" without touching the
  database.
- **For a business's support desk**, the Pro plan is the dependable answer: projects are never
  paused, and it adds daily backups.

## Check your work

```bash
pnpm check
```

This runs the Prettier check, then lint, typecheck, tests and build through Turborepo, which is
what CI runs. Turborepo caches results, so unchanged packages are skipped.

To work on one package:

```bash
pnpm --filter @helpwren/design-system test
pnpm --filter @helpwren/web lint
```

# Supabase Cloud and Vercel

Install Helpwren with its database in a Supabase project you own and the app on Vercel or any
Node host.

## Before you start

- Node 26 and pnpm 12 on the machine you install from.
- A [Supabase](https://supabase.com/dashboard) account.
- A [Vercel](https://vercel.com) account, or another host that runs Node 26.
- The address your install will use, such as `https://support.example.com`.

## Create a Supabase project

1. At [supabase.com/dashboard](https://supabase.com/dashboard), create a project. Note the
   database password you choose.
2. When it has finished setting up, collect four values. Keep the tab open while the installer
   asks for them.

   | Value                                         | Where it is                                                                                                                               |
   | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
   | **Project URL** (`https://<ref>.supabase.co`) | **Connect** at the top of the dashboard → **Framework**: the `NEXT_PUBLIC_SUPABASE_URL` line. Also under **Project Settings → Data API**. |
   | **Publishable key** (`sb_publishable_…`)      | **Project Settings → API Keys**                                                                                                           |
   | **Secret key** (`sb_secret_…`)                | **Project Settings → API Keys**, with the copy button: the field shows only its start                                                     |
   | **Session pooler connection string**          | **Connect → Direct**, method **Session pooler** (port 5432, a host ending in `pooler.supabase.com`)                                       |

   In the connection string, put your database password in place of `[YOUR-PASSWORD]`, without
   the brackets. Forgotten it? Reset it under **Project Settings → Database**. The installer uses
   the string only to apply the migrations, and never writes it to a file.

## Run the installer

1. Clone the repository and run the installer:

   ```bash title="Terminal"
   git clone https://github.com/Fewerlabs/helpwren.git && cd helpwren
   pnpm install
   pnpm helpwren install
   ```

2. Choose **Supabase Cloud** when it asks how you will run Helpwren, then give it the values
   from the previous step.

The installer checks Node, pnpm and the Supabase CLI (a dev dependency, which `pnpm install`
brings), then:

- writes `apps/web/.env.local` with your answers and a fresh `CRON_SECRET`, readable only by
  you, and never prints a secret back;
- applies the database migrations with
  [`supabase db push`](https://supabase.com/docs/reference/cli/supabase-db-push). It never loads
  the demo data unless you say yes, and never resets anything;
- with `--access-token` (a [personal access token](https://supabase.com/dashboard/account/tokens)),
  applies the Auth settings in the next step through the
  [Management API](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
  Without it, it lists them for you to set by hand.

To leave the connection string out, the installer can run `supabase link` instead, which signs
you in to Supabase in the browser.

### Run it unattended

For CI or scripts, give everything as flags or environment variables and add `--yes`:

```bash title="Terminal"
NEXT_PUBLIC_SUPABASE_URL=https://abcd.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
SUPABASE_SECRET_KEY=sb_secret_... \
SUPABASE_DB_URL='postgresql://postgres.abcd:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
SUPABASE_ACCESS_TOKEN=sbp_... \
pnpm helpwren install --yes --mode cloud --app-url https://support.example.com
```

| Flag                | Environment variable                   | Value                                                      |
| ------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `--mode`            | `HELPWREN_MODE`                        | `cloud` or `docker`                                        |
| `--app-url`         | `NEXT_PUBLIC_APP_URL`                  | The address people will use                                |
| `--supabase-url`    | `NEXT_PUBLIC_SUPABASE_URL`             | The Supabase Project URL                                   |
| `--publishable-key` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key                                        |
| `--secret-key`      | `SUPABASE_SECRET_KEY`                  | A secret key                                               |
| `--db-url`          | `SUPABASE_DB_URL`                      | The connection string, for the migrations                  |
| `--access-token`    | `SUPABASE_ACCESS_TOKEN`                | A personal access token, to apply the Auth settings        |
| `--demo-data`       |                                        | Loads the demo team, contacts and conversations            |
| `--overwrite`       |                                        | Replaces values already in the env file, never its secrets |
| `--skip-prereqs`    |                                        | Skips the checks for Node, pnpm and Docker                 |
| `--yes`             | `CI`                                   | Asks nothing: takes flags, the environment and defaults    |

`pnpm helpwren --help` lists every option.

## Configure Auth

Skip this step if you gave the installer `--access-token`. Otherwise, set Auth up with one
command, at any time after installing:

```bash title="Terminal"
pnpm helpwren auth
```

It reads the project and your install's address from `apps/web/.env.local`, asks for a
[personal access token](https://supabase.com/dashboard/account/tokens) without showing it, and
sets the three things below. The token is not saved. In CI, pass `--access-token` or
`SUPABASE_ACCESS_TOKEN` with `--yes`.

Or set them yourself in the Supabase dashboard:

1. **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**. Visitors
   chat as anonymous users; without this the chat cannot start.
2. **Authentication → Emails → Magic link**: set the subject to `Your Helpwren sign-in code` and
   paste [`supabase/templates/sign-in-code.html`](../../supabase/templates/sign-in-code.html) as
   the body. Team members sign in with the six-digit code it shows.
3. **Authentication → URL Configuration**: set the **Site URL** to your install's address.

> [!NOTE]
> Supabase's built-in email reaches only the members of your Supabase organisation, a few times
> an hour. Passwords need no email, so the team can sign in without it. For codes to reach anyone
> else, set up **Authentication → Emails → SMTP Settings**
> ([guide](https://supabase.com/docs/guides/auth/auth-smtp)).

## Deploy the app

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFewerlabs%2Fhelpwren&root-directory=apps%2Fweb&project-name=helpwren&repository-name=helpwren&env=NEXT_PUBLIC_APP_URL%2CCRON_SECRET&envDescription=Your%20install%20address%2C%20and%20a%20long%20random%20secret%20for%20the%20scheduled%20jobs%20%28openssl%20rand%20-hex%2032%29.&envLink=https%3A%2F%2Fhelpwren.fewerlabs.dev%2Fdocs%2Fget-started%2Fsupabase-cloud%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D)

1. Click **Deploy**. Vercel copies the repository to your Git account and sets the project's
   **Root Directory** to `apps/web`.
2. Connect a Supabase project when Vercel offers the
   [Supabase integration](https://supabase.com/docs/guides/integrations/vercel-marketplace). It
   fills in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SUPABASE_SECRET_KEY`.
3. Add the remaining two variables:

   | Variable              | Value                                                                  |
   | --------------------- | ---------------------------------------------------------------------- |
   | `NEXT_PUBLIC_APP_URL` | The address people will use, such as `https://support.example.com`     |
   | `CRON_SECRET`         | `openssl rand -hex 32`, or the one the installer wrote to `.env.local` |

4. If you deployed before running the installer, run it now against the same project, then
   [configure Auth](#configure-auth). Vercel lists the project's `POSTGRES_URL_NON_POOLING`
   under **Settings → Environment Variables**; it works as `--db-url`.

> [!NOTE]
> The deploy does not touch the database. Without the integration, add all five variables by
> hand from `apps/web/.env.local`. [Environment variables](../operations/environment-variables.md)
> lists every one.

### Deploy to another Node host

```bash title="Terminal"
pnpm build
pnpm --filter @helpwren/web start          # serves on port 3000; PORT=8080 to change it
```

Give the host the variables from `apps/web/.env.local`. `NEXT_PUBLIC_` values are written into
the browser's code at build time, so build where those variables are set.

## Schedule the jobs

Emails about unread replies and ticket changes, and pushes to phones, are sent by two jobs that
a scheduler must call every minute with `CRON_SECRET`:

```bash title="Terminal"
curl -X POST https://support.example.com/api/jobs/email -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://support.example.com/api/jobs/push -H "Authorization: Bearer $CRON_SECRET"
```

Any scheduler works: the host's cron, a GitHub Actions schedule, an uptime monitor, or the
database itself with `pg_cron`. [Scheduled jobs](../operations/scheduled-jobs.md) has the SQL.

> [!WARNING]
> Vercel Cron Jobs call routes with `GET`, and on the Hobby plan at most once a day. The jobs
> accept only `POST`, so use another scheduler.

## Create the first admin

Open `https://support.example.com/setup` and follow [the setup wizard](setup-wizard.md).

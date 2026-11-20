# @helpwren/cli

The Helpwren installer and upgrader, run from a checkout of the repository:

```bash
pnpm helpwren install            # set up this copy: env file, migrations, next steps
pnpm helpwren upgrade --dry-run  # see what an upgrade would do
pnpm helpwren upgrade            # pull, back up, migrate, rebuild
pnpm helpwren --help             # every option
```

[Get started](https://helpwren.fewerlabs.dev/docs/get-started) ([source](../../docs/get-started/index.md)) is the guide,
and
[ADR 0024](../../docs/decisions/0024-installer-and-setup-wizard.md) says why it works this way.

## Layout

| File             | Does                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `main.ts`        | Reads the command, flags and environment, and runs a flow                |
| `install.ts`     | The install flow, for Supabase Cloud or Docker                           |
| `upgrade.ts`     | The upgrade flow                                                         |
| `database.ts`    | Migrations through `supabase db push`, and `supabase link`               |
| `docker.ts`      | Fetches Supabase's self-hosting files at the pinned release              |
| `auth-config.ts` | The Supabase Auth settings Helpwren needs, through the Management API    |
| `env-file.ts`    | Reads and merges env files without losing what is there                  |
| `secrets.ts`     | Random secrets, and the API keys self-hosted Supabase signs with its JWT |
| `prereqs.ts`     | Checks Node, pnpm, the Supabase CLI, Docker and Git                      |
| `io.ts`          | Prompts at a terminal, or defaults in CI                                 |

Each flow takes a `Context` with the programs it runs, the prompts, the output and the clock, so
the tests (`*.test.ts`, `pnpm --filter @helpwren/cli test`) run the real flows with stand-ins.
Node runs the files as TypeScript directly; there is no build step.

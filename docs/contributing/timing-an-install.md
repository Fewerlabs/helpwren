# Timing a fresh install

How long installing takes, measured, so a change that slows it down is noticed.

Before a release, time a fresh install from a clean copy of the repository and compare it with
the figures below. If it takes much longer, find out why before releasing.

## Supabase Cloud path

Timed on 19 November 2026 on an Apple Silicon laptop, against a fresh, empty Supabase project
run locally on separate ports in place of a Cloud project:

| Step                                              | Time       |
| ------------------------------------------------- | ---------- |
| Start an empty Supabase project (local stand-in)  | 15 to 23 s |
| `pnpm install` (packages already in pnpm's store) | 4 s        |
| `pnpm helpwren install` (30 migrations)           | 4 to 7 s   |
| `pnpm build`                                      | 22 to 31 s |
| Start, until `/api/health` answers                | under 1 s  |
| The setup wizard, driven by its end-to-end test   | 6 s        |

Not measured: creating a real Cloud project, a first `pnpm install` with an empty store,
Vercel's build, and a person reading and typing.

## Docker path

On the same laptop, all fourteen containers healthy at the end:

| Step                                                         | Time  |
| ------------------------------------------------------------ | ----- |
| `docker compose pull` (Supabase's images, a few GB)          | 6 min |
| `pnpm helpwren install --mode docker`, images already pulled | 63 s  |
| Running it again (nothing to do but rebuild the app image)   | 45 s  |
| `pnpm helpwren upgrade` with one migration and a backup      | 48 s  |
| The setup wizard's end-to-end test against it                | 9 s   |

The whole stack used about 1.5 GB of memory once running.

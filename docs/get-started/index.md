# Choose how to install

Helpwren runs on Supabase Cloud with a Node host, or entirely on your own server with Docker.

|                          | Supabase Cloud and a Node host (recommended)    | Self-hosted with Docker                                             |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| Where the data lives     | A Supabase project you own                      | Your own server, in Docker volumes                                  |
| Where the app runs       | Vercel, or any host that runs Node 26           | The same server, in a container                                     |
| What you look after      | Almost nothing; Supabase backs up on paid plans | Postgres, backups, updates and TLS                                  |
| Machine you install from | Node 26, pnpm 12                                | A Linux server with Docker, Compose 2.20+, Git, Node 26 and pnpm 12 |

- [Supabase Cloud and Vercel](supabase-cloud.md)
- [Docker Compose](docker.md)

Both end the same way: open `/setup` in the browser, and [the setup wizard](setup-wizard.md)
creates the first admin. Then [hold your first conversation](first-chat.md) to check that
everything works.

[ADR 0024](../decisions/0024-installer-and-setup-wizard.md) explains why installing works this
way.

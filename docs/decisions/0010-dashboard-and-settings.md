# 0010: The dashboard, settings and the team

- **Status:** accepted
- **Date:** 2026-11-18

## Context

The inbox was the only screen the team had. Changing a setting meant editing the database, and
adding a team member meant running a script. An install could not be handed to anyone like that.

## Decision

- **Everything the team uses is under `/dashboard`.** One layout checks the sign-in, and a
  sidebar moves between sections. Sign-in is at `/login`, outside it. Sections that are planned
  and not built are shown, each saying what is coming, so the product's shape is visible.
- **Settings are changed through the client library, and the database decides who may.**
  `settings.update` writes rows of the `settings` table; the access rules from
  [ADR 0006](0006-database-and-access-rules.md) let only admins write. The same Zod schemas
  check a value when it is saved and when it is read.
- **Agents can read settings and cannot change them.** The screen shows them the values with
  the controls disabled; the database refuses them regardless.
- **The team is changed on the server.** The `agents` table grants the browser nothing but
  reading, so adding someone, changing a role and deactivating run as Server Actions with the
  secret key, after checking that the caller is an admin.
- **Nobody changes their own access,** which is how an admin locks themselves out by accident.
- **The database keeps one active admin.** A trigger on `agents` refuses any change that would
  leave none, with the code `HW409`. It is in the database so that no route, script or future
  screen can get around it.
- **Adding a team member sends no email.** The account exists at once and they sign in with a
  code as anyone does; the admin tells them. An invitation email waits for outgoing mail.
- **`pnpm agent:invite` stays, for the first admin.** A new install has no admin to add one from
  the screen. The setup wizard will replace it.

## Consequences

- A setting's shape is checked by the app, not the database. An admin writing to the table
  directly could store a value the app then rejects when it reads.
- Each settings page loads its data on the server and saves through a Server Action, so there is
  no settings API for other clients yet. The public API comes with the headless release.
- Deactivating someone takes effect on their next request; a page they already have open keeps
  showing what it loaded.

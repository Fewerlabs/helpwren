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

## Later changes

- 2026-11-18: sections share one frame, `DashboardPage`: a navigation column, then a single
  surface divided into columns. "Users" became "Contacts", because it lists guests as well as
  the host product's users. The inbox gained views and search.
- 2026-11-18: settings are grouped into Workspace (General, Branding, Installation, Team) and
  Personal (Profile, Notifications). Branding adds an optional colour and greeting to the `brand`
  setting; the chat applies the colour by setting the `--primary` tokens on its own root.
  Notification preferences are kept in the browser and not in the database, because permission to
  notify is the browser's to give, one device at a time. They cover desktop notifications and a
  sound while the dashboard is open. Email notifications wait for a way to send mail.
- 2026-11-18: Branding became four tabs: Brand (name, logo, colour or gradient), Widget
  (launcher position and icon, greeting, welcome message, quick replies), Chat page and Help
  center. They are stored as the public settings `brand`, `widget`, `chat_page` and
  `help_center`. The welcome message is shown by the chat and is not stored as a message, so
  opening the chat still creates nothing in the inbox.

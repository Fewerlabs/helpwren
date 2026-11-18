# 0006: Database schema and access rules

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Helpwren's code is public and the browser talks to the database through Supabase's Data API with
a key anyone can read. Nothing can rely on being hidden: what a guest, a user, a teammate or an
agent can read and write has to be decided by the database itself, and proven by tests.

## Decision

Six tables to begin with: `contacts`, `agents`, `conversations`, `messages`, `notes` and
`settings`. Migrations are plain SQL in `supabase/migrations`.

### Access rules

- **Row Level Security is on for every table**, and a test fails if a table is added without it.
- **Grants are explicit.** Each table revokes everything from the browser roles (`anon`,
  `authenticated`) and grants back only the operations that have a policy. A missing policy then
  fails loudly with "permission denied" instead of quietly returning nothing.
- **The server does what the browser may not.** Creating contacts, agents and conversations, and
  anything else without a policy, goes through the app's server with the secret key.
- **Helper functions live in a `private` schema** the Data API does not expose. They are
  `security definer` with an empty `search_path`, following Supabase's guidance, and policies
  call them as `(select private.is_agent())` so Postgres evaluates them once per query.
- **Columns that policies filter on are indexed.**

| Table           | Read                                                           | Write from the browser                               |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `contacts`      | The person themselves; agents                                  | Nobody                                               |
| `agents`        | Active agents                                                  | Nobody                                               |
| `conversations` | The owner; verified teammates in the same organisation; agents | Agents update. Nobody inserts or deletes             |
| `messages`      | Anyone who can read the conversation                           | The owner and agents insert, as themselves. No edits |
| `notes`         | Agents                                                         | Agents insert as themselves and change their own     |
| `settings`      | Public rows: everyone. All rows: agents                        | Admins                                               |

### Choices worth knowing

- **Organisation sharing is read from the contact's row, and only for verified contacts.** The
  first sketch read `org_id` from the session token. Looking it up in `contacts` means the rule
  does not depend on how tokens are issued, a change of organisation applies at once, and an
  unverified visitor who types an organisation id unlocks nothing. For the same reason a
  conversation's `org_id` is copied from its contact by a trigger, and only if the contact is
  verified.
- **Teammates read a shared conversation but do not add to it.** Only its owner and agents send
  messages. Revisit when tickets are built, if teammates should be able to reply.
- **A message's role, channel and time are set by a trigger** from who is really sending it, so a
  contact cannot post as an agent or backdate a message. Requests with no signed-in user come
  from the server and are trusted as written.
- **Agents have a role**, `admin` or `agent`. Only admins change settings. A deactivated agent
  loses all access at once, including to their own row.
- **Text columns with check constraints, not Postgres enums**, for values such as status and
  priority. Adding a value is then an ordinary migration.
- **Only the tables the current work needs.** The knowledge base, device and canned-reply tables
  arrive with the features that use them, as do `messages.attachments` and the ticket number
  sequence.

### Tests

Database tests use pgTAP and live in `supabase/tests`, one file per table. Each acts as a cast of
people (a visitor with no session, two guests, a verified user, their teammate, an unverified
user claiming the same organisation, a signed-in stranger, an agent, an admin and a deactivated
agent) and checks what each can and cannot do. `pnpm db:test` runs them; so does CI.

### Generated types

`pnpm db:types` writes the schema's TypeScript types to `packages/core/src/database.types.ts`.
The file is committed, and CI fails if it does not match the migrations.

## Consequences

- Every new table needs its grants, policies and a test file in the same change. The structure
  test catches a table with no rules, but not rules that are too loose.
- Work that needs the secret key has to live on the server, which means an API route for things
  a simpler app would do from the browser.
- Contributors need Docker to run the database and its tests.

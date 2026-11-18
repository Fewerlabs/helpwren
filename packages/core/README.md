# @helpwren/core

> **Status: in development, not published.** The API will change until the first stable release.

Headless client library for Helpwren. No interface code lives here. The official widget, support
screen and inbox are built only on this library, so anything they can do a custom interface can
do too.

## What it does today

```ts
import { createHelpwrenClient } from "@helpwren/core";

const helpwren = createHelpwrenClient({ supabase });

await helpwren.settings.getPublic(); // brand and other settings anyone may read
await helpwren.auth.sendLoginCode(email); // email a team member a sign-in code
await helpwren.auth.verifyLoginCode(email, code); // { ok: true, agent } or { ok: false, reason }
await helpwren.agents.me(); // the signed-in team member, or null
await helpwren.auth.signOut();
```

The caller passes in a Supabase client typed with `Database`, because how a session is stored
depends on where the code runs. Screens call these functions and never read the tables.

Outcomes a screen should handle, such as a wrong code, come back as values. A `HelpwrenError` is
thrown only for failures the caller could not have prevented.

## What comes next

- Sessions: guest sessions and identified users (`identify`, `reset`).
- Conversations and messages: list, create, send, and live subscriptions to replies.
- Articles: find by filter and search.
- Unread counts for badges.

## Tests

```bash
pnpm --filter @helpwren/core test       # unit tests
pnpm --filter @helpwren/core test:db    # against the local database; run `pnpm db:start` first
```

`src/database.types.ts` is generated from the migrations by `pnpm db:types`. Do not edit it.

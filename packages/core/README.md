# @helpwren/core

> **Status: in development, not published.** The API will change until the first stable release.

Headless client library for Helpwren. No interface code lives here. The official widget, support
screen and inbox are built only on this library, so anything they can do a custom interface can
do too.

## What it does today

```ts
import { createHelpwrenClient } from "@helpwren/core";

const helpwren = createHelpwrenClient({ supabase });

// A visitor
await helpwren.sessions.startGuest(); // keeps the session a returning visitor already has
await helpwren.conversations.start({ message, contact: { name, email } });
await helpwren.conversations.list(); // their own conversations, newest first
await helpwren.messages.list(conversationId);
await helpwren.messages.send(conversationId, "Hello");
const stop = await helpwren.messages.subscribe(conversationId, (message) => {});
await helpwren.conversations.markRead(conversationId);
await helpwren.conversations.unreadCount("contact");

// A team member
await helpwren.auth.sendLoginCode(email);
await helpwren.auth.verifyLoginCode(email, code);
await helpwren.agents.me();
await helpwren.conversations.list(); // every conversation
await helpwren.conversations.subscribe({ inbox: true }, (conversation) => {});
await helpwren.conversations.search("refund"); // by who it is with, or what was said
await helpwren.conversations.update(id, { assigneeId, status: "resolved", priority: "high" });
await helpwren.conversations.convertToTicket(id, "Refund for a damaged order");
await helpwren.notes.add(id, "Courier confirmed the damage."); // only the team sees notes
await helpwren.contacts.list({ search: "northwind", kind: "user" });
await helpwren.settings.update({ brand: { name: "Acme" } }); // admins only
await helpwren.auth.signOut();

// Anyone
await helpwren.settings.getPublic(); // brand, and what guests are asked for
```

The caller passes in a Supabase client typed with `Database`, because how a session is stored
depends on where the code runs. Screens call these functions and never read the tables. Calls
that the access rules leave to the server (`conversations.start`, `conversations.markRead`) go
to the Helpwren app's API; pass `apiUrl` if the app is on another origin.

Outcomes a screen should handle, such as a wrong code or writing too fast, come back as values:
`{ ok: false, reason }`. A `HelpwrenError` is thrown only for failures the caller could not have
prevented. Lists return `{ items, nextCursor }`; pass `nextCursor` back as `cursor` for the next
page. Subscriptions resolve once listening has started and return a function that stops them.

## What comes next

- Identified users (`identify`, `reset`).
- Articles: find by filter and search.

## Tests

```bash
pnpm --filter @helpwren/core test       # unit tests
pnpm --filter @helpwren/core test:db    # against the local database; run `pnpm db:start` first
```

`src/database.types.ts` is generated from the migrations by `pnpm db:types`. Do not edit it.

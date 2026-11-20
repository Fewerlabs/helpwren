# 0021: Typing indicators, presence and saved replies

- **Status:** accepted
- **Date:** 2026-11-19

## Context

Support tools people already use (Intercom, Zendesk, Featurebase) show both sides when the
other is typing, show the team when a colleague has the same conversation open, tell visitors
whether anyone is around, and let an agent drop a prepared answer into the reply box. Helpwren
has none of these. It has to stay inside Supabase's free plan: 200 concurrent Realtime
connections and about two million Realtime messages a month. Until now every live update came
from the database through `realtime.broadcast_changes`, and browsers could only listen
([ADR 0011](0011-tickets-and-notes.md)).

## Decision

### Typing and presence

- **Browsers send, on private channels, and nothing is stored.** Typing is client-sent Realtime
  broadcast; "viewing" and "online" are Realtime presence. Three new kinds of channel:

  | Channel                     | Carries                   | Who may listen                    | Who may send               |
  | --------------------------- | ------------------------- | --------------------------------- | -------------------------- |
  | `typing:<conversation id>`  | broadcast `typing` events | whoever may read the convo        | whoever may read the convo |
  | `viewing:<conversation id>` | presence of team members  | the team                          | the team                   |
  | `presence:team`             | presence of team members  | anyone, with or without a session | the team                   |

  The migration adds an INSERT policy on `realtime.messages` (`helpwren_send`) and extends the
  SELECT policy's `CASE` on the topic prefix. "May read the conversation" is the same `exists`
  on `conversations` the `conversation:` channel uses, so the conversation's own rules decide.
  Sending also checks `extension`: a contact may broadcast on `typing:` but never be present
  there, and nobody may send on the database's own channels.

- **A separate SELECT policy for `anon`.** A visitor who has not written has no session, but the
  home screen still says whether the team is online. Postgres checks table privileges for every
  table a policy names, whichever `CASE` branch runs, and `anon` may not read `conversations`, so
  folding `anon` into the main policy would refuse it everything. `helpwren_listen_team` lets
  `anon` read `presence:team` and nothing else.
- **An event says who and whether, nothing else.** `{ userId, typing, name?, avatar? }`. The team
  sends its name and photo so the visitor sees "Ada is typing…" with Ada's face; visitors send
  neither, and the inbox names them from the conversation. It is sent at most every 2.5 seconds
  while typing, and `typing: false` on send, on clearing the box, on leaving it and on switching
  to a note. A receiver drops someone five seconds after their last event, so a closed tab clears
  itself. Writing a note never sends anything.
- **Channels are joined only where they are used.** A conversation's typing channel is joined
  while that conversation is open on screen, by its visitor or by an agent, and shared by every
  part of the screen that needs it (the thread, the reply box and the inbox's presence strip use
  one channel, through the sharing in `packages/core/src/realtime.ts`). A browser only sends on a
  channel it already has open, so sending never opens one. Agents join `presence:team` while any
  dashboard page is open. The chat watches it only while it is open and its page is showing: the
  widget now tells the frame `open` in `hello` and sends a `panel` message when the visitor opens
  or closes the chat (see [Visitors and online status](../chat/visitors.md)).
- **Agents see each other on a strip under the header.** "Sam is viewing", or "Sam is typing…"
  when a colleague is writing a reply, with their faces. Not in the header: it has no room on a
  phone, and it should never cost the contact's name.
- **The client side is in core.** `presence.typing(conversationId, sender)` returns
  `{ start, stop, subscribe }`; `presence.viewing(id, onChange)`; `presence.team.join()` and
  `presence.team.watch(onCount)`. Presence is keyed by user id, so two tabs count once.
- **No "typing…" hint in the conversation list.** It would mean joining a typing channel for
  every conversation in the list, which is exactly the cost this design avoids.

### Why this fits the free plan

- **Connections.** A Realtime connection is one WebSocket per browser tab, however many channels
  it joins. Visitors browsing with the chat closed hold none, because nothing is joined until the
  chat is opened; visitors who have not written join only `presence:team`, and only while the
  chat is open. A busy site with ten agents and a few dozen visitors with the chat open at once
  stays well under 200.
- **Messages.** Realtime counts each delivery. Typing is throttled to one event per 2.5 seconds
  per writer and reaches only the people with that conversation open, usually two or three. A
  team answering 300 conversations a day, typing for a minute in each, sends about 300 × 24
  events × 3 receivers ≈ 22,000 deliveries a day, about 650,000 a month. Presence changes when
  someone opens or leaves the dashboard or a conversation, not continuously. Visitors watching
  team presence receive a change only when an agent comes or goes, and never send one.
- **The database is untouched.** Nothing about typing or presence is written to Postgres, so it
  adds no rows, no WAL and no `broadcast_changes` triggers.

### Saved replies

- **One table, two kinds.** `saved_replies` has a title, a plain-text body with placeholders, an
  optional shortcut (lowercase words joined by hyphens, unique across the install), a
  `visibility` of `team` or `personal` (with `owner_id`, required for personal and absent for
  team), `created_by`, and timestamps.
- **Who may change what.** Every active agent reads the team's replies and their own personal
  ones, and may add either kind, as themselves. A personal reply is changed and deleted only by
  its owner, not even by an admin, because it is theirs. A team reply is changed and deleted by
  its author or by any admin: shared text should not be rewritten by anyone on the team, and its
  author should never be locked out of fixing it. `created_by` is excluded from the UPDATE grant,
  so who wrote a reply never changes.
- **Placeholders are filled in the browser,** as the reply is put into the box, by a pure
  function in core (`fillPlaceholders`): `{contact.first_name}`, `{contact.name}`,
  `{contact.email}`, `{agent.first_name}`, `{agent.name}`, `{brand.name}`,
  `{conversation.number}`. Each has a fallback ("there" for a first name, "this conversation"
  for a missing ticket number), so a reply never goes out with a gap or a raw placeholder.
  Unknown braces are left alone. The agent sees the filled text and can change it before sending.
- **The reply box.** `/` at the start of a line or after a space opens a list that narrows on
  title and shortcut as the agent types; the arrows move, Enter or Tab inserts, Escape closes,
  and Enter with no match closes the list instead of sending "/refnd" to a customer. The field
  keeps focus and points at the active option with `aria-activedescendant`. A toolbar button
  opens the same list with a search field (a `combobox`), and "Save as reply" turns what is typed
  into a new reply. It works in both Reply and Note.
- **Filtered in the browser, on purpose.** Elsewhere Helpwren searches in the database, never in
  what the browser happens to have loaded. Here the browser loads the whole set once, when the
  picker is first wanted, and filters it on every keystroke: the set is small (tens, not
  thousands), it is complete, so the answer is exact, and a round trip per key would make the
  list lag behind typing. Settings > Saved replies searches in the database, like every other
  list.

## Consequences

- A typing event's `name` and `avatar` are what the sender says. Realtime authorizes a channel
  when it is joined, not each message, so a contact could send an event naming someone else in
  their own conversation. Only they would see it, and the inbox names people from its own team
  list and the conversation, not from the event.
- "We're online" means someone has the dashboard open, not that they are at their desk. Office
  hours and an away switch can come later.
- A dropped connection can leave someone shown as present for up to Realtime's presence timeout,
  and as typing for five seconds.
- A personal reply leaves with its owner when they are removed from `agents`; a team reply stays,
  with no author.
- Shortcuts are unique across personal and team replies alike, so a personal shortcut can be
  refused because of one the person cannot see. The message says it is taken.

# 0013: Sessions for the host product's users

- **Status:** accepted
- **Date:** 2026-11-18

## Context

A guest is an anonymous Supabase Auth user ([ADR 0008](0008-guest-chat-server.md)), and every
access rule is written against `auth.uid()`. A product's own logged-in user has to become one
stable person in that scheme, on every device, without ever having an account or a password
here: Helpwren's server confirms who they are with the host product, and then has to hand the
chat a session.

Supabase Auth has no call that makes a session for a given user. The options, from its
documentation as of this date:

- **Follow a sign-in link on the server.** `auth.admin.generateLink` makes the token a magic
  link would carry, and `verifyOtp` exchanges it for an access and a refresh token. Both calls
  are documented; using them together on the server, with no email sent, is not described
  anywhere.
- **Sign our own tokens.** A project can import a signing key and mint its own access tokens.
  There is no refresh token, `supabase.auth.*` stops working in a client that uses them, and
  `getClaims` is documented as meant for tokens Supabase Auth issued.
- **Third-party auth with a custom issuer.** Needs a public HTTPS issuer with discovery and
  asymmetric keys, and is not available in the local stack.

## Decision

- **A user of the host product is a real Supabase Auth user**, found by an address made from
  their id in the host product: the SHA-256 of the id, at `users.helpwren.invalid`. Nothing is
  ever sent to it. The address is the lookup, so the same id gives the same user on any device
  with no table of our own to keep in step.
- **The server signs them in by following a sign-in link itself:** `sessionForUser`
  (`apps/web/src/lib/supabase/user-session.ts`) creates the user the first time, makes the link,
  and exchanges its token. The chat loads the result with `setSession`. From there the session
  is an ordinary one: it renews itself, the API routes verify it as they verify a guest's, and
  the access rules and live channels need no change.
- **The exchange uses a client of its own.** `verifyOtp` signs in the client it is called on,
  and the admin client must never start acting as one user.
- **Signing in at the same moment is expected,** when a browser restores several tabs at once.
  A user has one link at a time, so each new link replaces the one before it; the function asks
  again, a few times, a little apart.
- **The function trusts the id it is given.** Confirming it is the identity adapter's job, and
  nothing else may call this.

## Consequences

- This rests on two documented calls used in a way the documentation does not show. The
  database test (`apps/web/tests/user-session.db.test.ts`) is the guard: it signs in, reads under
  the access rules, listens live, renews, and signs in from five tabs at once. If a Supabase
  release breaks the chain, that test fails, and signing our own tokens is the fallback.
- A session, once given, renews itself for as long as Supabase allows. Ending it when the user
  logs out of the host product is the chat's job (it drops a user session the page does not
  vouch for again), not something this function can do. Supabase can only revoke a session with
  that session's own token, not by user id.
- Every identified user adds a row to `auth.users`, with an address that means nothing to a
  person reading the table. Their real email, when the host product gives one, lives on the
  contact.
- The address depends on the id alone. An install that changes how it numbers its users gets new
  users here.

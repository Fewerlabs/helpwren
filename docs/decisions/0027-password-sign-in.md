# 0027: Passwords for team members

- **Status:** accepted
- **Date:** 2026-11-21

## Context

Signing in by code ([0007](0007-agent-sign-in.md)) needs email to arrive. A new Supabase Cloud
project sends Auth email only to its organisation's members, a few an hour, and its template, which
must be changed to show the code, stays locked until custom SMTP is set up. An install whose
owner cannot set up SMTP yet had no way in for its team.

## Decision

- **A password as well as the code.** The sign-in page asks for an email and password, with
  **Email me a code instead** below. Supabase Auth keeps the passwords; Helpwren stores none.
- **The first admin chooses one in the setup wizard** and is signed in straight away, so setting
  up needs no email at all.
- **Admins set passwords for others.** On an invite, optionally, and with **Set password** on a
  member's row, which is also how a forgotten password is reset without email. Never their own
  there: each person changes their own under Profile, typed twice.
- **At least 8 characters, at most 72 bytes**, bcrypt's limit. Never trimmed.
- **Tries are limited** per email (10) and per network (50) in 15 minutes, in the app's own rate
  limit table, because Supabase sees every request coming from the app's server. The email is kept
  only as a keyed hash.
- **The same answer for a wrong password and an unknown email**, so the page still cannot be used
  to find out who is on the team.

## Consequences

- No "forgot password" email: an admin sets a new one. An admin who forgets theirs asks another
  admin, or signs in with a code.
- Sign-in codes stay, for teams that prefer no passwords and for anyone locked out of one.

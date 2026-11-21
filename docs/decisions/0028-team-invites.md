# 0028: Team invites

- **Status:** accepted
- **Date:** 2026-11-21

## Context

Adding someone under **Settings → Team** created their account and sent nothing. The admin had to
tell them to sign in, and could type a password for them, which the admin then knew for good
([0027](0027-password-sign-in.md)). The owner asked for an invite email that lets the new member
set their own password, and for a way in that needs no email at all. A fixed default password was
rejected: anyone who knows it could take over a new account before its owner signs in.

## Decision

- **Three ways in, chosen in the invite dialog.** An emailed link, the same link for the admin to
  copy, or a temporary password. Emailing is the default when email is set up, and cannot be
  chosen when it is not; the link is the default then. The password field on the invite is gone.
- **Invite links carry a random token; the database keeps its hash.** 32 random bytes in
  base64url, stored as a SHA-256 in `agent_invites`, which grants nothing to `anon` or
  `authenticated`. A plain hash is enough because the token is random, not chosen by a person.
- **A link works once, for 7 days.** Using it is a single conditional update, so two tries at once
  cannot both succeed. A new link for the same person deletes the unused old one, and
  deactivating them deletes theirs, by a trigger on `agents`.
- **Accepting sets the password with the secret key, then signs in as the person** with their new
  password, through the cookie-backed server client. Unknown, used and expired links all show the
  same page, which names nobody.
- **A temporary password is four words from a built-in list of 256, and two digits**, about 39
  bits. It is meant to be read out, is used at a sign-in that is limited to a few tries, and is
  replaced at once. It is shown to the admin once and stored nowhere but Supabase Auth.
- **The forced change is a mark in `app_metadata`**, `must_change_password`, which only the
  server can write and which travels in the session's token. `requireAgent()` sends anyone with
  it to `/choose-password`. Saving a password there, or under Profile, clears it and refreshes
  the session so the new token no longer carries it.
- **"Invited" means never signed in.** Supabase Auth keeps the time of the last sign-in, which no
  API role can read, so `public.agent_sign_ins()` returns it for team members only, to the server
  only.
- **Limits.** 30 invite emails an hour per admin, and 30 tries at accepting an invite per network
  in 15 minutes, in the app's rate limit table.

## Consequences

- An admin who loses a link makes a new one; the old one stops working. Nothing can show a link
  or a temporary password a second time.
- **Set password** on a member's row stays, for resets, and does not ask for a change at the next
  sign-in.
- Invite emails go through the install's own email provider, not Supabase Auth, so they need
  **Settings → Email** set up but not Supabase's SMTP.

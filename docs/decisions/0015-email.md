# 0015: Sending email

- **Status:** accepted
- **Date:** 2026-11-19

## Context

Tickets need email: to tell a contact their ticket moved or that a reply is waiting, to let
them answer from their inbox, and to alert the team. Helpwren is self-hosted, so it cannot
assume a mail provider.

## Decision

- **An adapter per provider, with SMTP as the one that always works.** `EmailAdapter` in
  `apps/web/src/lib/email` has one method, `send`. There are two to begin with: SMTP, which every
  provider offers, and Resend's API, which needs only a key. `EMAIL_PROVIDER` picks one; unset,
  the install sends no mail and says so in Settings → Email.
- **Secrets stay in the server's environment** (`SMTP_URL`, `RESEND_API_KEY`), never in the
  database or the browser. The dashboard shows which provider is in use, not its details.
- **Who mail is from is a setting**, `email`, with a from address and an optional from name
  that falls back to the brand's. It is not public: a visitor has no use for it. Without a from
  address nothing is sent.
- **Sending never throws for a mail problem.** `sendEmail` returns what happened: sent, not
  configured, rejected by the provider, or unreachable. Callers carry on, so a mail outage does
  not break replying or changing a ticket.
- **A test email goes only to the admin who asks for it**, so the button cannot be used to mail
  anyone else. The provider's own error is shown to that admin, who is the person able to act
  on it.

## Consequences

- Nothing sends until an admin has set both a provider on the server and a from address in the
  dashboard. The Email page says which is missing.
- Each provider's deliverability rules (verified domains, SPF, DKIM) are the adopter's to set
  up. A rejection is passed on in the provider's words.
- Reply by email and the emails themselves build on this in the next steps.

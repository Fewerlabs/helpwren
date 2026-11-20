# Sending email

Email contacts about replies they have not read and changes to their tickets, through SMTP or
Resend.

Email is off until a provider is set. It covers what Helpwren itself sends; team members'
sign-in codes are sent by Supabase Auth, set up separately (see
[Configure Auth](../get-started/supabase-cloud.md#configure-auth)).

## Before you start

- An SMTP server, or a [Resend](https://resend.com) account with a verified domain.
- The [scheduled jobs](../operations/scheduled-jobs.md) running: the email job sends what is due.

## Set it up

1. Add the provider to the app's environment and restart or redeploy it:

   ```bash title="apps/web/.env.local"
   # Any SMTP server
   EMAIL_PROVIDER=smtp
   SMTP_URL=smtps://user:password@smtp.example.com:465

   # Or Resend
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_...
   ```

   With Docker Compose, set `EMAIL_PROVIDER` and `HELPWREN_SMTP_URL` (or `RESEND_API_KEY`) in
   `deploy/docker/.env`, then run `docker compose up --detach helpwren`.

2. In **Settings → Email**, set the **From address**, on a domain your provider lets you send
   from, and optionally a **From name**. Without one, your brand's name is used.
3. Under **Try it**, send a test email to yourself.
4. Choose what contacts are sent, under **To your contacts**.

| Setting                      | Sends                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Replies they have not read   | Your team's reply, five minutes later, if the contact has not read it in the chat |
| Changes to a ticket's status | A note when your team resolves, reopens or parks one of their tickets             |

Contacts are emailed only when they have an email address: one they typed, or one your product
passed when [signing them in](../users/index.md).

## Let contacts reply

Each email can carry a reply address, so a contact answers from their mail app and the answer
lands in the same conversation. See [Replies by email](replies.md).

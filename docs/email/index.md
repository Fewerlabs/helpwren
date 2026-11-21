# Sending email

Email contacts about replies they have not read and changes to their tickets, through SMTP or
Resend.

Email is off until a mail server is set. It covers what Helpwren itself sends; team members'
sign-in codes are sent by Supabase Auth, set up separately (see
[Configure Auth](../get-started/supabase-cloud.md#configure-auth)). The sign-in page offers
**Email me a code** only once the install can send email.

## Before you start

- An SMTP server, or a [Resend](https://resend.com) account with a verified domain. Your mail
  provider lists its SMTP server, port, username and password.
- The [scheduled jobs](../operations/scheduled-jobs.md) running: the email job sends what is due.

## Set it up

1. Choose where the mail server is set.

   **In the dashboard** (simplest). In **Settings → Email**, under **Sending**, enter the
   **SMTP server**, **Port** (587 for most providers, or 465), **Username** and **Password**,
   exactly as your provider gives them, then **Save changes**. It works at once, with no
   redeploy. The password is kept on the server and never shown again; leave the field empty to
   keep it, and clear **SMTP server** to remove it. Only admins can change it.

   **On the server.** Add the values to the app's environment and restart or redeploy it. These
   win over the dashboard, which then only shows the status:

   ```bash title="apps/web/.env.local"
   # Any SMTP server, values as they are
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=support@example.com
   SMTP_PASSWORD=your-password

   # Or Resend
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_...
   ```

   `SMTP_URL`, such as `smtps://user:password@smtp.example.com:465`, still works in place of the
   four values. In it, characters such as `@`, `#`, `/` and `?` in the username or password must
   be percent-encoded (`%40`, `%23`, `%2F`, `%3F`), which is why the separate values are easier.

   With Docker Compose, set `HELPWREN_SMTP_HOST`, `HELPWREN_SMTP_PORT`, `HELPWREN_SMTP_USER`
   and `HELPWREN_SMTP_PASSWORD` (or `EMAIL_PROVIDER` and `RESEND_API_KEY`) in
   `deploy/docker/.env`, then run `docker compose up --detach helpwren`. Or leave them out and
   use the dashboard.

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

## Change what the emails say

Every email is in your brand: your logo, your button colour and your name, from **Settings →
Branding**. Its words are yours to change in **Settings → Email templates**, one tab per email:

| Template      | Sent when                                                |
| ------------- | -------------------------------------------------------- |
| Chat reply    | A contact has not read your team's reply in the chat     |
| Ticket reply  | A contact has not read your team's reply on their ticket |
| Ticket status | Your team changes the status of a contact's ticket       |

Each has a subject, a heading, a message and a button. A field left empty uses Helpwren's wording,
which is shown in it, and **Reset to default** empties all four. A blank line in the message starts
a new paragraph. The preview beside the form shows the email with made-up details, and **Send me a
test** sends it to you as it reads, before you save.

These placeholders are filled in for the contact each email goes to:

| Placeholder   | Becomes                                     |
| ------------- | ------------------------------------------- |
| `{{brand}}`   | Your brand name                             |
| `{{name}}`    | The contact's first name, or "there"        |
| `{{ticket}}`  | The ticket's number and subject             |
| `{{replies}}` | "a new reply" or "3 new replies"            |
| `{{status}}`  | The ticket's new status, such as "Resolved" |

The replies themselves, the line saying the contact can answer by email, and the small print saying
why they got the email are always added, so every email still makes sense whatever it says.

## Let contacts reply

Each email can carry a reply address, so a contact answers from their mail app and the answer
lands in the same conversation. See [Replies by email](replies.md).

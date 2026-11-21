# Your team

Invite the people who answer, choose who can change settings, and group them into teams.

## Invite a team member

1. As an admin, open **Settings → Team** and choose **Invite**.
2. Enter their name and work email, and choose a role.
3. Under **How they join**, choose one of the three ways below, then send or create the invite.

Until they first sign in, their row shows **Invited**.

### Email an invite

Helpwren emails them "Ada invited you to Acme's support team", in your brand, with a **Set your
password** button. The button opens `https://support.example.com/invite/…`, where they choose a
password and land in the inbox, signed in.

This is the default once email is set up in **Settings → Email** (see [Email](../email/index.md)).
Without email it cannot be chosen. If the email cannot be sent, the dialog shows the link instead,
so you can send it yourself. Each admin can send 30 invite emails an hour.

### Copy an invite link

The same link, shown once in the dialog with a copy button, for you to send them in chat or
another email. Helpwren keeps only a hash of it, so it cannot be shown again: to get a link
later, choose **Copy invite link** on their row, which makes a new one.

### Set a temporary password

Helpwren makes a password of four words and two digits, such as `maple-otter-violin-quartz-42`,
and shows it once, with a copy button. Tell them what it is. They sign in at
`https://support.example.com/login` straight away, with no email needed, and are then asked to
choose their own password before they can open any dashboard page.

### How long an invite lasts

An invite link works once, for 7 days. Making a new one, with **Send invite again** or **Copy
invite link** on their row, stops the old one working. Deactivating someone stops any link they
have not used. A link that is used, out of date or unknown says "This invite has expired. Ask an
admin for a new one."

| Role  | Can                                                                       |
| ----- | ------------------------------------------------------------------------- |
| Agent | Answer conversations, write notes and saved replies, edit the help center |
| Admin | Everything an agent can, and change the workspace settings and the team   |

Agents can open the workspace settings but not change them. Admins can **Make admin**, **Make
agent**, **Deactivate** and **Reactivate** members.

## Passwords

A password signs in without email. An admin sets one for anyone else with **Set password** on
their row, for someone who has none or has forgotten theirs; it replaces any they had, so tell
them what it is. Each person changes their own under **Settings → Profile**. Passwords are at
least 8 characters, and Supabase Auth keeps them hashed.

When nobody can sign in to set one, such as an admin with no password on an install with no
email yet, set it from the command line with the install's secret key. It asks for the password
without showing it:

```bash
pnpm agent:password admin@example.com
```

After 10 tries for one email, or 50 from one network, within 15 minutes, sign-in with a
password is refused until the time is up. A code still works.

> [!NOTE]
> Sign-in codes are sent by Supabase Auth. On Supabase Cloud, set up SMTP for Auth before
> anyone outside your Supabase organisation signs in with a code. See
> [Configure Auth](../get-started/supabase-cloud.md#configure-auth).

## Teams

Under **Teams** on the same page, group members by what they handle, such as Billing or Technical.
Each team gets a view in the inbox, and a conversation or ticket can be assigned to one.

## Your profile

Each person sets their photo, name and password in **Settings → Profile**. Contacts see them beside replies
and in "typing…".

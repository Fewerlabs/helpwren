# Your team

Invite the people who answer, choose who can change settings, and group them into teams.

## Invite a team member

1. As an admin, open **Settings → Team** and choose **Invite**.
2. Enter their name and work email, and choose a role. Optionally, give them a password.
3. They sign in at `https://support.example.com/login` with that password, or with a six-digit
   code sent to their email.

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

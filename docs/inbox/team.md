# Your team

Invite the people who answer, choose who can change settings, and group them into teams.

## Invite a team member

1. As an admin, open **Settings → Team** and choose **Invite**.
2. Enter their name and work email, and choose a role.
3. They sign in at `https://support.example.com/login` with a six-digit code sent to that email.

| Role  | Can                                                                       |
| ----- | ------------------------------------------------------------------------- |
| Agent | Answer conversations, write notes and saved replies, edit the help center |
| Admin | Everything an agent can, and change the workspace settings and the team   |

Agents can open the workspace settings but not change them. Admins can **Make admin**, **Make
agent**, **Deactivate** and **Reactivate** members.

> [!NOTE]
> Sign-in codes are sent by Supabase Auth. On Supabase Cloud, set up SMTP for Auth before
> inviting anyone outside your Supabase organisation. See
> [Configure Auth](../get-started/supabase-cloud.md#configure-auth).

## Teams

Under **Teams** on the same page, group members by what they handle, such as Billing or Technical.
Each team gets a view in the inbox, and a conversation or ticket can be assigned to one.

## Your profile

Each person sets their photo and name in **Settings → Profile**. Contacts see them beside replies
and in "typing…".

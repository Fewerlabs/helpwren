# The setup wizard

Create the first admin of a new install, then set the brand, email and widget.

`/setup` opens on an install with nobody on its team; `/login` and `/dashboard` send you there.

> [!WARNING]
> Until the first admin exists, anyone who can reach `/setup` can become it. Finish this step
> straight after deploying.

## Steps

1. **Create the first admin.** Enter your name and email. Helpwren emails a six-digit code to
   sign you in; there are no passwords. Supabase Auth sends it: see
   [Configure Auth](supabase-cloud.md#configure-auth) for Supabase Cloud's limits, or the test
   mailbox on a local stack. If no code arrives, **Send a new code** shows why Supabase refused.
2. **Brand.** Set the name, logo and colour.
3. **Email.** See whether a provider is set up, set the from address, and send a test email.
4. **Install the widget.** Copy the snippet into your site. The live check turns green, "Seen on
   example.com just now", as soon as the widget loads on a real page.
5. **Done.** Links to the inbox, the help center and these docs.

Each step after the first can be skipped and done later in **Settings**.

## Once the admin exists

The database creates the first admin under a lock, so two people setting up at the same moment
cannot both succeed. Once anyone is on the team, `/setup` only offers to sign in, then closes for
good. Add more people under [Settings → Team](../inbox/team.md).

To create an admin from the command line instead:

```bash title="Terminal"
pnpm agent:invite you@example.com --name "You" --admin
```

Next: [your first conversation](first-chat.md).

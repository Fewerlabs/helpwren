# 0007: How team members sign in

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Team members sign in to the inbox with Supabase Auth. The plan asks for invite-only accounts.
Sign-in also sets the pattern for how the app talks to Supabase and to `@helpwren/core`.

## Decision

- **A six-digit code by email, no password.** The person types their email, then the code sent to
  it. A code works across devices and inside an app's web view, where an emailed link would open
  in a different browser from the one waiting for it. It needs no callback route. Codes last ten
  minutes and work once. Google sign-in can be added later as a setting.
- **Invite-only.** Requesting a code never creates an account. Until the settings screen exists,
  `pnpm agent:invite <email> --name "Their Name" [--admin]` adds a team member, using the secret
  key from the command line.
- **The same answer for every email.** Asking for a code looks the same whether or not the email
  is on the team, so the page cannot be used to find out who is.
- **Having an account is not enough.** After the code is accepted, the person must be an active
  row in `agents`. Otherwise they are signed out at once. Every protected page checks again with
  `requireAgent()`, so deactivating someone takes effect on their next request.
- **Sessions live in cookies, handled on the server.** Sign-in, sign-out and the checks run in
  Server Actions and Server Components through `@supabase/ssr`. `src/proxy.ts` refreshes the
  session, and only on `/inbox`, the one place sessions exist so far. Identity is read with
  `getClaims()`, which verifies the token, never with `getSession()`.
- **The app builds the Supabase client and hands it to `@helpwren/core`.** How a session is stored
  depends on where the code runs, so that part stays in the app. Screens call the client library
  and never read tables. This is an internal arrangement and may change before the library is
  published.
- **The sign-in email is a template in the repository**, `supabase/templates/sign-in-code.html`,
  because Supabase's default email sends a link and not a code.

## Consequences

- A hosted Supabase project needs the same email template and code lifetime. The local stack
  takes them from `supabase/config.toml`; the installer will have to apply them to hosted
  projects.
- Signing in depends on email arriving. A real install needs an email provider configured in
  Supabase before anyone can sign in.
- Requests to Supabase Auth come from the app's server, so Supabase's per-address rate limits
  see one address for everyone. The app needs its own limit on code requests before release;
  that belongs with the abuse protection work.
- The app now needs two environment variables to start, so a fresh checkout needs `pnpm db:env`
  or a copied `.env.example` before it builds.

## Later changes

- 2026-11-18: the team's screens moved from `/inbox` to `/dashboard`, and sign-in from
  `/inbox/login` to `/login`. Where this record says `/inbox`, read `/dashboard`.
- 2026-11-21: team members can also sign in with a password, which needs no email. See
  [0027](0027-password-sign-in.md).

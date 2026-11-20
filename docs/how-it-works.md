# How it fits together

A Helpwren install is one Next.js app and one Supabase project.

Your site and your apps talk to the app; the app and the visitor's chat talk to Supabase.

```text
your site ── <script src=".../widget.js"> ──▶  Helpwren (Next.js)  ──▶  your Supabase
your app  ── SupportScreen (React Native) ──▶   /embed  chat           Postgres, Realtime,
                                                 /help   help center    Storage, Auth
                                                 /dashboard  inbox
```

## The app

The app in `apps/web` serves everything people see:

| Address      | Who it is for         | What it is                                                                  |
| ------------ | --------------------- | --------------------------------------------------------------------------- |
| `/widget.js` | Your site             | The script that adds the launcher and opens the chat in a frame             |
| `/embed`     | Visitors              | The chat itself, shown in the widget's frame or in a mobile app's web view  |
| `/chat`      | Visitors              | The same chat on a page of its own, for a link where there is no site       |
| `/help`      | Everyone              | The public help center, with its own sitemap                                |
| `/dashboard` | Your team             | The inbox, contacts, live visitors, the help center editor and settings     |
| `/setup`     | The first admin       | The wizard a new install opens with                                         |
| `/api/...`   | Your servers and apps | Identity, unread counts, devices for push, scheduled jobs, the health check |

Every one of these runs on your install's address, such as `https://support.example.com`.

## The widget

A site loads `/widget.js` from the install and calls `Helpwren.init`. The script draws a
launcher in a shadow root, so your CSS and the widget's cannot affect each other, and opens
`/embed` in a frame when someone clicks it. The page and the frame talk with `postMessage`: the
page says who the visitor is and where they are, and the chat says when it opens, closes or has
unread replies. The page never sees a visitor's messages. [Add the chat](chat/index.md) covers
every option.

## The database

Supabase holds everything: Postgres for conversations, contacts, articles and settings; Realtime
for live messages, typing and online status; Storage for attachments and logos; and Auth for
sign-in. A visitor chats as an anonymous Supabase user, and the team signs in with a six-digit
code sent by email. Access rules in the database decide who can read what, so the visitor's chat
can read and write only its own conversations even though it talks to Supabase directly.

Settings live in the database too, not in code: an admin changes the brand, identity, email and
the rest from the dashboard, and the change applies without a deploy.

## Scheduled jobs

Emails about unread replies and ticket changes, and pushes to phones, are sent by two jobs. A
scheduler of your choice calls them every minute. See [Scheduled jobs](operations/scheduled-jobs.md).

## Where it runs

- **Supabase Cloud and Vercel**: the database in a Supabase project you own, the app on Vercel
  or any host that runs Node. See [Supabase Cloud and Vercel](get-started/supabase-cloud.md).
- **Your own server**: the app, Supabase's own self-hosting stack and a small scheduler in Docker
  Compose. See [Docker Compose](get-started/docker.md).

# Introduction

Helpwren is open-source, self-hosted live chat, tickets and a help center that plug into any
product.

Each product runs its own install, on its own address and in its own Supabase database. There is
no per-seat pricing, and the code is MIT licensed.

## Where to start

These docs follow how far you take Helpwren. Most sites stop after the first two steps; each
later one is optional.

| Step                                | What you get                                                             |
| ----------------------------------- | ------------------------------------------------------------------------ |
| [Get started](get-started/index.md) | An install of your own, a first admin and a working chat                 |
| [Add the chat](chat/index.md)       | The chat on your site from one script tag, styled and placed as you want |
| [Know your users](users/index.md)   | Logged-in users recognised, with their history on every device           |
| [Help center](help-center/index.md) | Articles that rank in search engines and show in the chat                |
| [Mobile and push](mobile/index.md)  | The chat as a screen of your React Native or Expo app, with push         |
| [Email](email/index.md)             | Notifications by email, and replies by email back into the chat          |

The rest is for running it: [the inbox](inbox/index.md) for your team,
[security and abuse protection](security/index.md), and [operations](operations/upgrading.md):
upgrades, backups, scheduled jobs and the health check.

## What it does

- **Live chat** for visitors and logged-in users, with attachments, typing indicators, online
  status and a rating at the end of a conversation.
- **Tickets**: a conversation with a number, status, priority and assignee, plus internal notes
  only the team can see.
- **An inbox** for the team, with views, search, contacts, saved replies and live visitors.
- **A help center** with collections, articles and search, built to rank in search engines and
  embeddable in your own site. Featured articles show on the chat's home screen.
- **A widget** loaded by one snippet, or the [`helpwren`](packages/helpwren.md) package for an app
  that bundles its own code.
- **A mobile screen** for React Native and Expo apps, with an unread badge and push through Expo,
  Firebase or a webhook to your own backend.
- **Email** through SMTP or Resend, and replies by email that land in the same conversation.
- **Your brand**: name, logo and colour, in light and dark.

## What it does not do

Helpwren is deliberately small. It has no AI answers, chatbot builder, phone or social channels,
or hosted version. You run it yourself, on Supabase Cloud with Vercel or on your own server with
Docker. [How it fits together](how-it-works.md) shows the pieces, and
[Concepts](concepts.md) the words the rest of these docs use.

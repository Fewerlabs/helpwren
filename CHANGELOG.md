# Changelog

What changes for someone running Helpwren, one section per release. Each package keeps its own
changelog beside it, such as [packages/widget/CHANGELOG.md](packages/widget/CHANGELOG.md).

## 0.1.0

The first release: live chat, tickets and a help center you run yourself, on your own Supabase.

### What you get

- **Live chat** for guests and logged-in users, with attachments, typing indicators, online
  status, and a rating when a conversation ends.
- **Tickets** with numbers, status, priority, assignees, teams and internal notes, and a ticket
  form in the chat.
- **The inbox**: views, search across what was said and who said it, contacts, saved replies with
  placeholders, and the visitors on your site right now.
- **A help center** with collections, articles, videos and search, structured data and a sitemap.
  It can be embedded in your own site, and featured articles show on the chat's home screen.
- **Identity**: guests, unverified details, a signed token, or your product's profile endpoint, so
  a user's history follows them across devices.
- **Mobile**: `@helpwren/react-native` for React Native and Expo apps, with push through Expo,
  Firebase or a webhook to your own backend.
- **Email** notifications through SMTP or Resend, and replies by email that land back in the same
  conversation.
- **Abuse protection**: rate limits, spam checks, blocking contacts and networks, and an optional
  captcha.
- **Your brand** on the chat, the chat page and the help center, in light and dark.

### Installing

`pnpm helpwren install` sets up Supabase Cloud with Vercel, or everything on your own server with
Docker Compose. A new install opens `/setup` to create the first admin and walk through brand,
email and the widget. See [Get started](https://helpwren.fewerlabs.dev/docs/get-started).

### Packages

- [`helpwren`](https://www.npmjs.com/package/helpwren) 0.1.0: the widget, for apps that bundle
  their own code.
- [`@helpwren/react-native`](https://www.npmjs.com/package/@helpwren/react-native) 0.1.0.

### Known limits

- Until the first admin exists, anyone who can reach `/setup` can become it. Finish setup right
  after deploying.
- Vercel's scheduled jobs run once a day on the Hobby plan and only call with `GET`, so pending
  emails need another scheduler there. [Scheduled jobs](https://helpwren.fewerlabs.dev/docs/operations/scheduled-jobs) lists options.
- The React Native screen has not yet been tried on real devices.

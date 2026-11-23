# Next.js example

A Next.js App Router app with the Helpwren chat on every page.

- [`src/app/helpwren-script.tsx`](src/app/helpwren-script.tsx) loads `widget.js` from your
  install with `next/script` and calls `Helpwren.init()`. The root layout renders it once.
- [`src/app/help-buttons.tsx`](src/app/help-buttons.tsx) opens the chat from your own button,
  shows the unread count, and starts a conversation with a message already written.

## Run it

Start the Helpwren app from the repository root (`pnpm dev`), then:

```bash
pnpm --filter @helpwren/example-nextjs dev
```

Open http://localhost:4300.

To use another install, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_HELPWREN_URL`.
If the install lists [allowed domains](../../docs/security/allowed-domains.md), add
`localhost:4300` to them.

## Next steps

- Sign your users in to the chat: [Identify your users](../../docs/users/index.md).
- Every option and method: [Add the chat](../../docs/chat/index.md).

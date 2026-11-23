# Examples

Small sites that use Helpwren the way an adopter would.

## plain-html

One HTML page with the widget's two script tags. Start the Helpwren app (`pnpm dev`), then:

```bash
node examples/plain-html/serve.mjs
```

Open http://127.0.0.1:4100. The page is served from a different address than the app on
purpose: that is how a real site embeds the chat, and it is what the browser tests use.

http://127.0.0.1:4100/inline shows the chat inside a page's own layout (`mode: "inline"`), with
no launcher. Every option a site has is listed in [Add the chat](../docs/chat/index.md).

## nextjs

A Next.js App Router app that loads the chat with `next/script` in its root layout, and opens it
from its own buttons. Start the Helpwren app (`pnpm dev`), then:

```bash
pnpm --filter @helpwren/example-nextjs dev
```

Open http://localhost:4300. See [nextjs/README.md](nextjs/README.md).

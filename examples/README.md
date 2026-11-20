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
no launcher. Every option a site has is listed in [docs/widget.md](../docs/widget.md).

## nextjs

A Next.js app standing in for Glown, Helpwren's first install: a public site with the script
tag and the help center at its own `/help`, and a web app that signs its users in to the chat
with their own JWT through a profile endpoint. See [nextjs/README.md](nextjs/README.md).

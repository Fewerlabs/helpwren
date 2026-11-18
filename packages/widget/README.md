# helpwren

> **Status: in development, not published.** The API will change until the first stable release.

The script a site loads to show the Helpwren chat. It has no dependencies and builds to about
5 kB. Each install serves its own copy at `/widget.js`.

## Using it

```html
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ source: "web" });
</script>
```

That adds a round launcher button in the corner, which opens the chat in a panel. On a phone the
chat takes the whole screen.

| Call                                  | Does                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `Helpwren.init({ source, launcher })` | Adds the chat to the page. `launcher: false` leaves out the button                |
| `Helpwren.show()` / `hide()`          | Opens or closes the panel, for a site with its own Help button                    |
| `Helpwren.on("unread", fn)`           | Calls `fn(count)` when the unread count changes. Returns a function that stops it |

`source` is one of the install's sources and defaults to `web`. See
[`examples/plain-html`](../../examples/plain-html/index.html) for a complete page.

## How it works

- The script works out where its install is from its own `src`, so there is nothing to configure.
- It adds one element to the page with a shadow root, so the site's CSS and the widget's cannot
  affect each other.
- The chat itself is the app's `/embed` page in a frame. The script and the frame talk with
  `postMessage`, using the messages in `src/protocol.ts`. The script only listens to its own
  frame on the install's origin, and the frame only sends to the page that answered it.
- Which sites may embed the chat is the install's `allowed_domains` setting, enforced by the
  browser.

## What comes next

- `identify`, `reset`, `open` and `setContext`.
- Accent colour, font and radius from the install's settings.

## Working on it

```bash
pnpm --filter helpwren test     # unit tests
pnpm --filter helpwren build    # writes dist/widget.js
```

The app builds and copies the script itself when it starts (`apps/web/scripts/build-widget.mjs`),
so `pnpm dev` always serves the current code. Restart it after changing the widget.

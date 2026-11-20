# helpwren

The script that puts the [Helpwren](https://github.com/Fewerlabs/helpwren) chat on a website.
It has no dependencies and is about 6.5 kB gzipped.

## On any site: a script tag

Every Helpwren install serves its own copy of the script at `/widget.js`, so most sites need
nothing from npm:

```html
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ source: "web" });
</script>
```

That adds a launcher button in the corner, which opens the chat in a panel. On a phone the chat
takes the whole screen. Settings → Installation in your install writes this snippet for you,
with your address already in it.

## In an app with a bundler: this package

```bash
npm install helpwren
```

```ts
import { createWidget } from "helpwren";

const chat = createWidget("https://support.example.com");
chat.init({ source: "web" });
chat.identify({ token: () => auth.getHelpwrenToken() });
chat.on("unread", (count) => setBadge(count));
```

The package and the script tag behave the same and share one set of types.
`helpwren/protocol` holds the messages the page and the chat exchange, for a host that builds its
own frame.

## Methods

| Method                            | Does                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| `init({ source, launcher, ... })` | Adds the chat to the page. `launcher: false` leaves out the button         |
| `show()`, `hide()`, `toggle()`    | Opens or closes the panel, for a site with its own Help button             |
| `startConversation(draft?)`       | Opens a new conversation, with an optional message ready to send           |
| `identify(identity)`, `reset()`   | Says who the visitor is, or forgets them when they log out                 |
| `setContext(context)`             | Tells the team about the page, such as the plan or order the visitor is on |
| `update({ appearance, layout })`  | Changes the look or layout after `init`                                    |
| `on(event, listener)`             | `ready`, `open`, `close`, `unread`, `identity`. Returns a function to stop |
| `destroy()`                       | Takes the widget off the page                                              |

The full guide, with logged-in users, the chat inside your own page, and what each option does,
is [Add the chat](https://helpwren.fewerlabs.dev/docs/chat).

## How it works

- The script adds one element with a shadow root, so the site's CSS and the widget's cannot
  affect each other.
- The chat is the install's `/embed` page in a frame. The page and the frame talk with
  `postMessage`; the script listens only to its own frame on the install's origin, and the frame
  sends only to the page that answered it.
- Which sites may show the chat is the install's allowed domains setting, enforced by the
  browser.

## Working on it

```bash
pnpm --filter helpwren test     # unit tests
pnpm --filter helpwren build    # dist/widget.js for the script tag, dist/lib for npm
```

The app builds and copies the script when it starts (`apps/web/scripts/build-widget.mjs`), so
`pnpm dev` always serves the current code. Restart it after changing the widget.

## Licence

MIT

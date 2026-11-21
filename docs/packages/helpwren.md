# helpwren

Reference for the `helpwren` npm package, the widget for apps that bundle their own code.

The package and the script tag behave the same and share one set of types. A site with a script
tag needs nothing from npm: every install serves the widget at `/widget.js`. The package has no
dependencies and is about 6.5 kB gzipped.

## Install

```bash title="Terminal"
npm install helpwren
```

## Use

```ts title="support.ts"
import { createWidget } from "helpwren";

const chat = createWidget("https://support.example.com");
chat.init({ source: "web" });
chat.identify({ token: () => auth.getHelpwrenToken() });
chat.on("unread", (count) => setBadge(count));
```

## createWidget

```ts title="Signature"
createWidget(appOrigin: string): HelpwrenWidget
```

`appOrigin` is your install's address. The returned object has the [methods](../chat/methods.md)
of `window.Helpwren`:

| Method                   | Signature                                                            |
| ------------------------ | -------------------------------------------------------------------- |
| `init`                   | `(options?: InitOptions) => void`                                    |
| `show`, `hide`, `toggle` | `() => void`                                                         |
| `isOpen`                 | `() => boolean`                                                      |
| `startConversation`      | `(draft?: string) => void`                                           |
| `identify`               | `(identity: Identity) => void`                                       |
| `reset`                  | `() => void`                                                         |
| `setContext`             | `(context: PageContext) => void`                                     |
| `update`                 | `(changes: { appearance?, layout? }) => void`                        |
| `on`                     | `(event, listener) => () => void`                                    |
| `destroy`                | `() => void`                                                         |
| `embedHelp`              | `(container: HTMLElement, options?: HelpEmbedOptions) => () => void` |

`createHelpEmbed(appOrigin, container, options?)` does the same as `embedHelp` without a widget,
and `helpEmbedUrl(appOrigin, options?)` returns the frame's address. See
[Embedding](../help-center/embedding.md).

## Types

| Type               | What it is                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `InitOptions`      | The options of `init`. See [Options](../chat/options.md)                                                                                       |
| `Appearance`       | `position`, `offsetX`, `offsetY`, `accent`, `accentTo`, `accentInk`, `launcher`. See [Appearance](../chat/appearance.md)                       |
| `WidgetLayout`     | `width`, `height`, `zIndex`                                                                                                                    |
| `Identity`         | `{ token: string \| (() => string \| Promise<string>) }`, or `{ id?, name?, email? }` for [unverified details](../users/unverified-details.md) |
| `IdentityState`    | `{ state: "guest" }`, `{ state: "user" }` or `{ state: "failed", reason: "expired" \| "rejected" \| "off" \| "error" }`                        |
| `PageContext`      | `Record<string, string \| number \| boolean \| null>`. See [Context](../users/context.md)                                                      |
| `HelpwrenEvents`   | The [events](../chat/events.md) and their listeners                                                                                            |
| `HelpEmbedOptions` | `hide`, `collection`, `query`, `padding`, `background`, `theme`, `accent`, `title`. See [Embedding](../help-center/embedding.md)               |
| `HelpEmbedPart`    | A part `hide` can leave out, such as `"search"`                                                                                                |

## helpwren/protocol

`helpwren/protocol` holds the messages the page and the chat exchange, for a host that builds its
own frame, such as a native app. See [Other platforms](../mobile/other-platforms.md).

## How it works

- The widget adds one element with a shadow root, so the site's CSS and the widget's cannot
  affect each other.
- The chat is the install's `/embed` page in a frame. The page and the frame talk with
  `postMessage`; the widget listens only to its own frame on the install's origin, and the frame
  sends only to the page that answered it.
- Which sites may show the chat is the install's [allowed domains](../security/allowed-domains.md),
  enforced by the browser.

Its changes are listed in
[`packages/widget/CHANGELOG.md`](../../packages/widget/CHANGELOG.md).

# helpwren

## 0.1.0

### Minor Changes

- First release. The script that puts the Helpwren chat on a site, as a script tag served by
  each install at `/widget.js` and, new in this release, as an npm package with `createWidget`
  and types.
- `init`, `show`, `hide`, `toggle`, `isOpen`, `startConversation`, `identify`, `reset`,
  `setContext`, `update`, `on` and `destroy`, with the `ready`, `open`, `close`, `unread` and
  `identity` events.
- A launcher with the wren, a welcome teaser and an unread badge, in a shadow root so the site's
  styles and the widget's stay apart. The chat can also sit inside a page with no launcher.
- Contextual help: `setContext({ filter })` picks the articles the chat lists under "Help for
  this page"; `data-helpwren-help` blocks on the page fill with article links that open in the
  chat; `findArticles(filter)` and `openArticle(slug)`.
- `helpwren/protocol`: the messages the page and the chat exchange.

# Methods

Control the chat from your page's code.

The script tag defines `window.Helpwren`. The [`helpwren`](../packages/helpwren.md) package
returns an object with the same methods from `createWidget`.

| Method                             | What it does                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Helpwren.init({ ... })`           | Adds the chat to the page. See [Options](options.md).                                                                          |
| `Helpwren.show()` / `hide()`       | Opens or closes the chat.                                                                                                      |
| `Helpwren.toggle()`                | Opens it if closed, closes it if open.                                                                                         |
| `Helpwren.isOpen()`                | Whether it is open now.                                                                                                        |
| `Helpwren.startConversation(text)` | Opens a new conversation. `text`, if given, is put in the message box; the visitor sends it or changes it.                     |
| `Helpwren.identify({ ... })`       | Says who the visitor is. See [Know your users](../users/index.md).                                                             |
| `Helpwren.reset()`                 | Forgets who the visitor is. Call it when they log out.                                                                         |
| `Helpwren.setContext({ ... })`     | Tells the team where the visitor is, such as `{ plan: "pro", orderId: 1234 }`. See [Context](../users/context.md).             |
| `Helpwren.update({ ... })`         | Changes `appearance` or `layout` after `init`, for example when your site switches theme.                                      |
| `Helpwren.on(event, listener)`     | Listens for an [event](events.md). Returns a function that stops listening.                                                    |
| `Helpwren.destroy()`               | Takes the widget off the page. `init` can add it again.                                                                        |
| `Helpwren.embedHelp(element, {})`  | Puts the help center in a frame inside `element`, sized to fit. Needs no `init`. See [Embedding](../help-center/embedding.md). |

`identify`, `setContext` and `on` keep what they are given, and the chat receives it once it
has loaded, so they work before or after `init`. Opening and closing the chat need `init` first.

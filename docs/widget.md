# The widget on your site

A site shows Helpwren by loading one script from its install and calling `init`. Everything
below is optional: with no options you get a launcher in the corner that opens the chat, looking
the way Branding in the dashboard says.

```html
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ source: "web" });
</script>
```

Branding sets the defaults for every site. The options here are for one site or one page that
wants something different, and they win over Branding where they are given.

## Options for `init`

| Option       | What it does                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`     | Which of the install's sources this page is. Default `web`.                                                                                               |
| `launcher`   | `false` hides the round button, for a site that opens the chat from its own.                                                                              |
| `trigger`    | Your own buttons or links that open and close the chat: a CSS selector, an element or a list of elements. Each gets `aria-expanded`.                      |
| `mode`       | `floating` (default) is a launcher and a panel. `inline` puts the chat straight into `container`, always open, with no launcher.                          |
| `container`  | An element, or a CSS selector for one. Inline, the chat fills it. Floating, the launcher and panel sit inside it and it must be positioned.               |
| `appearance` | Your own `position` (`right` or `left`), `offsetX`, `offsetY` (pixels, up to 120), `accent`, `accentTo`, `accentInk` (six-digit hex) and `launcher` icon. |
| `layout`     | `width` (320 to 640) and `height` (420 to 900) of the floating panel in pixels, and `zIndex`.                                                             |
| `welcome`    | `false` keeps the welcome message and quick replies from showing beside the launcher.                                                                     |
| `open`       | `true` starts with the chat open.                                                                                                                         |

Values outside a range are brought into it, and anything that is not a valid colour, number or
address is ignored, so a mistake leaves the widget as it was.

## The chat inside your own page

```html
<div id="support" style="height: 640px"></div>
<script>
  Helpwren.init({ mode: "inline", container: "#support" });
</script>
```

The chat takes the size of the element, and never goes below 280 by 420 pixels, the smallest it
still works at. Size and shape the element however your page needs; its rounded corners carry
through. There is no launcher and no close button, because there is nothing to close into.

## Your own button

```html
<button id="help">Help</button>
<script>
  Helpwren.init({ launcher: false, trigger: "#help" });
</script>
```

## Methods

| Method                             | What it does                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Helpwren.show()` / `hide()`       | Opens or closes the chat.                                                                                  |
| `Helpwren.toggle()`                | Opens it if closed, closes it if open.                                                                     |
| `Helpwren.isOpen()`                | Whether it is open now.                                                                                    |
| `Helpwren.startConversation(text)` | Opens a new conversation. `text`, if given, is put in the message box; the visitor sends it or changes it. |
| `Helpwren.update({ ... })`         | Changes `appearance` or `layout` after `init`, for example when your site switches theme.                  |
| `Helpwren.on(event, listener)`     | Listens for an event. Returns a function that stops listening.                                             |
| `Helpwren.destroy()`               | Takes the widget off the page. `init` can add it again.                                                    |

## Events

| Event    | When                                                                     |
| -------- | ------------------------------------------------------------------------ |
| `ready`  | The chat has loaded.                                                     |
| `open`   | The chat was opened, by the visitor or by your code.                     |
| `close`  | The chat was closed.                                                     |
| `unread` | The number of unread messages changed. The listener is given the number. |

```js
Helpwren.on("unread", (count) => {
  document.querySelector("#help-badge").textContent = count > 0 ? String(count) : "";
});
```

## What a page cannot do

The page around the chat never sees a visitor's messages, and it cannot send one for them. Text
passed to `startConversation` is only a draft in the message box. Only sites listed under
Installation → Allowed domains can show the chat at all.

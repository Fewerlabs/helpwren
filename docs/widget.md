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

| Method                             | What it does                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Helpwren.show()` / `hide()`       | Opens or closes the chat.                                                                                                  |
| `Helpwren.toggle()`                | Opens it if closed, closes it if open.                                                                                     |
| `Helpwren.isOpen()`                | Whether it is open now.                                                                                                    |
| `Helpwren.startConversation(text)` | Opens a new conversation. `text`, if given, is put in the message box; the visitor sends it or changes it.                 |
| `Helpwren.identify({ ... })`       | Says who the visitor is. See "Logged-in users" below.                                                                      |
| `Helpwren.reset()`                 | Forgets who the visitor is. Call it when they log out.                                                                     |
| `Helpwren.setContext({ ... })`     | Tells the team where the visitor is, such as `{ plan: "pro", orderId: 1234 }`. Sent with the next conversation they start. |
| `Helpwren.update({ ... })`         | Changes `appearance` or `layout` after `init`, for example when your site switches theme.                                  |
| `Helpwren.on(event, listener)`     | Listens for an event. Returns a function that stops listening.                                                             |
| `Helpwren.destroy()`               | Takes the widget off the page. `init` can add it again.                                                                    |

## Events

| Event      | When                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ready`    | The chat has loaded.                                                                                                                                                           |
| `open`     | The chat was opened, by the visitor or by your code.                                                                                                                           |
| `close`    | The chat was closed.                                                                                                                                                           |
| `unread`   | The number of unread messages changed. The listener is given the number.                                                                                                       |
| `identity` | The chat signed in as your user, went back to a guest, or could not sign in. The listener is given `{ state: "user" }`, `{ state: "guest" }` or `{ state: "failed", reason }`. |

```js
Helpwren.on("unread", (count) => {
  document.querySelector("#help-badge").textContent = count > 0 ? String(count) : "";
});
```

## Logged-in users

There are two ways to say who a visitor is, and they do different things.

**With a token**, the install checks it and signs the chat in as that user. Their conversations
follow them to every device, and what they wrote as a guest on this one becomes theirs.

```html
<script>
  Helpwren.init({ source: "web_app" });
  // A function, so a fresh token can be fetched if one expires.
  Helpwren.identify({ token: () => fetch("/api/support-token").then((r) => r.text()) });

  // When they log out:
  Helpwren.reset();
</script>
```

Your server makes the token: a JWT signed with HS256 and a signing key from your install, with
the user's id in `sub`, an `exp` no more than a day ahead (a few minutes is plenty), and
optionally `name`, `email`, `org: { id, name }`, `audience` and `attributes`. Never sign it in
the browser or ship the key in an app: anyone holding the key can be any of your users.

Call `identify` straight after `init` on every page where someone is logged in. A page that
loads without it shows a guest's chat, even if a user was signed in there before, so someone who
logs out of your product does not stay logged in to support.

**Without a token**, `Helpwren.identify({ id, name, email })` only labels the visitor for your
team and fills in the form for them. They stay a guest, their history stays on this device, and
the team sees them as unverified. It needs no server work, and it unlocks nothing: typing someone
else's email into the console only mislabels your own chat.

`setContext` values are shown to the team as "From the page". Like labels, they are the page's
word and are never treated as fact.

## What a page cannot do

The page around the chat never sees a visitor's messages, and it cannot send one for them. Text
passed to `startConversation` is only a draft in the message box. Only sites listed under
Installation → Allowed domains can show the chat at all.

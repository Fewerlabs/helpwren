# Visitors and online status

See who is on your site, and show visitors whether your team is online.

Both work on their own, with nothing extra on your page.

## Who is on your site

While **Track visitors** is on (**Settings → General**), the chat checks in with your install
about once a minute while its page is showing, at once when the page changes, and never while
the tab is hidden. It sends the page's address and title, where the visitor came from, the
browser's language and time zone, and a random id it keeps in its own storage. The install works
out the browser, system and device from the request, and the country, region and city from your
hosting platform's headers when it sends them (Vercel and Cloudflare do). There is no lookup of
the address, and visitors' IP addresses are never stored.

With **Live visitors** on as well, the team sees who is on the site now under **Visitors**, and
once someone writes, the same details beside their conversations. A team member can write first
to someone in Visitors: the message waits until that visitor's chat next checks in, then arrives
like any reply, as a count on the launcher with the message beside it.

The widget follows moves in a single-page app too (`history.pushState`, `replaceState`, the back
button and hash changes).

## Whether the team is online

The chat's home screen and the top of a conversation say **We're online**, with a green dot,
while anyone on the team has the dashboard open, and **We'll reply as soon as we can** when
nobody does. The chat finds out over a live connection, which it holds only while the chat is
open and its page is showing: a page view with the chat closed holds nothing open.

Inside a conversation the visitor sees "Ada is typing…", with the team member's photo, while
someone on the team writes a reply (never a note), and the team sees the visitor typing.

The newest unread reply shows beside the launcher, and clicking it opens that conversation.

## The messages between page and chat

For a host that builds its own frame, such as a native app, these are the messages the widget
sends the chat about the page. Every message is listed in
[`packages/widget/src/protocol.ts`](../../packages/widget/src/protocol.ts).

```js title="Page to chat"
// When the frame is ready: the page, where the visitor came from, and whether the chat is open.
{ channel: "helpwren", type: "hello", page: { url, title }, referrer: "https://...", closable, open, identified }
// When the page changes without loading, or the tab is hidden or shown:
{ channel: "helpwren", type: "page", page: { url, title }, visible: true }
// When the visitor opens or closes the chat:
{ channel: "helpwren", type: "panel", open: true }
```

A host that leaves `open` out of `hello`, such as a mobile app showing the chat as a whole
screen, counts as open. The chat's `unread` message carries the newest unread reply as well:

```js title="Chat to page"
{ channel: "helpwren", type: "unread", count: 1, latest: { conversationId: "…", preview: "Hi! Can I help?" } }
```

`latest` is left out when nothing is unread. The preview is plain text of at most 300
characters, and the widget shows it as text.

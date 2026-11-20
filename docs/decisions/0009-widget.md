# 0009: The widget script

- **Status:** accepted
- **Date:** 2026-11-18

## Context

A site adds Helpwren by pasting a script tag. That script runs on someone else's page, next to
their code and their CSS, and has to open a chat that belongs to another origin.

## Decision

- **A small script with no dependencies, and the chat in a frame.** The script draws a launcher
  and a panel; the chat inside the panel is the app's `/embed` page. The site's page never runs
  the chat's code, and the chat keeps its own origin, storage and styles.
- **Served by the install at `/widget.js`.** The script reads its own `src` to learn where its
  install is, so the snippet needs no address or key. The app builds the script from
  `packages/widget` and copies it into its public folder whenever it starts or builds.
- **A shadow root** holds the launcher and panel, so neither side's CSS reaches the other.
- **`postMessage`, with a fixed set of messages** defined once in `packages/widget/src/protocol.ts`
  and validated on both sides. The frame first says it is ready, which carries nothing. The page
  answers with its address and title. The frame remembers the origin that answered and sends
  everything else only there; the script listens only to its own frame on the install's origin.
- **Allowed domains are enforced by the browser.** `/embed` is served with a
  `frame-ancestors` policy built from the `allowed_domains` setting, so a site that is not listed
  cannot load the chat into a frame at all. With no domains set there is no policy, so a new
  install works before it is configured. Entries are hosts (`example.com`, `*.example.com`);
  sites must use HTTPS, except local addresses.
- **The API starts small:** `init`, `show`, `hide` and `on("unread")`, shaped like Intercom's so
  it is familiar. `identify`, `reset`, `open` and `setContext` follow with the features they need.
- **The chat frame loads with the page, not on first open,** so the unread count is right before
  the visitor clicks anything.

## Consequences

- Every page view of a site with the widget loads `/embed`. It creates no session and stores
  nothing until the visitor writes, but it is a request to the install each time.
- An install with no allowed domains can be framed by any site. The settings screen should push
  admins to set them.
- The chat's session lives in storage that browsers partition by the embedding site. A visitor
  has one history per site, and Safari may clear it after a week without a visit.
- The script is not versioned separately from the app. An install always serves the widget that
  matches its own `/embed`, which removes a whole class of mismatch, and means the script cannot
  be cached for long.

## Later changes

- 2026-11-18: the script asks the install how it should look (`GET /api/widget`: position,
  spacing, colour, launcher icon) instead of having one fixed look. The answer is public and
  cacheable for a minute, and each value is checked before it reaches a style or an attribute.
  `init` gained `container`, `preview` and `open`, and the widget gained `preview()` and
  `destroy()`, so the dashboard can run the real script as its preview. A `preview` message
  joined the protocol; the chat accepts it only from a page on its own origin.
- 2026-11-18: with a welcome message or quick replies set, the script shows them beside the
  launcher until the chat is opened or they are dismissed, for that visit. Tapping one sends
  the chat a `start` message; the chat uses a reply only if it is one of the install's own.
- 2026-11-18: a site can shape the widget itself, over the install's Branding: an `inline` mode
  that fills an element of the page, its own `trigger` elements, `appearance` and `layout`
  overrides, `toggle`, `isOpen`, `startConversation(draft)`, `update`, and `ready`, `open` and
  `close` events. A draft from the page is only put in the message box; the chat still sends
  nothing a visitor did not send. The full list is in [Options](../chat/options.md).
- 2026-11-19: `identify`, `reset`, `setContext` and an `identity` event. The page's greeting
  says whether it vouches for a logged-in user, a token is handed over by message and never in
  an address, and the chat answers with what happened. A chat still signed in as a user signs
  out when the page greets it without one. See
  [ADR 0014](0014-identity-adapters.md) and [Know your users](../users/index.md).

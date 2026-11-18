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

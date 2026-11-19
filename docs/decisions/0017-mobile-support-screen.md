# 0017: The support screen in mobile apps

- **Status:** accepted
- **Date:** 2026-11-19

## Context

A product's mobile apps need the chat as one of their screens: signed in as the app's user,
told what the user is looking at, showing an unread badge outside the chat, and opening the
conversation a notification was about. Building the chat again in native components would mean
two chats to keep in step.

## Decision

- **A web view of `/embed`, not native components.** The app shows the same page the widget
  frames, so a change to the chat reaches the apps with no app release. Native components stay
  for the headless release.
- **The same messages as the widget, over the web view's channel.** The chat sends JSON strings
  to `window.ReactNativeWebView.postMessage`; the app answers by running a script that
  dispatches a message event in the page. The chat takes such an event, which has no source and
  no origin, as the app's, and ignores any message from another window. The script writes the
  message as escaped JSON, so nothing in it can run. `hello` may leave out the page address, and
  a new `open` message shows one conversation.
- **`@helpwren/react-native` ships `SupportScreen`.** It loads only the install's own pages,
  opens any other link in the system browser, listens only to the install's page, hands over
  the token once the chat says it is ready, and fetches a fresh token once when one expires.
  `react-native-webview` is a peer dependency, so the app owns the native version.
- **`POST /api/unread` takes the app's own token.** The app can show a badge without holding a
  Helpwren session: the install checks the token as `identify` does and counts the user's unread
  replies. It creates nobody; a user who has never written has nought.

## Consequences

- With a profile endpoint, each badge check asks the host product who the token is for. Apps
  should check when they come to the front, not on a timer.
- The chat's session lives in the web view's storage. If the system clears it, the app's token
  signs the user in again the next time the screen opens.
- The screen has been tested in a browser that plays the web view, not yet on real iOS and
  Android devices.

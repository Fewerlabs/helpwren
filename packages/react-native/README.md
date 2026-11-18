# @helpwren/react-native

> **Status: stub.** Nothing is implemented yet. This package exists so the workspace layout,
> naming and tooling are settled before product work starts.

Support screen for React Native and Expo apps.

## What it will contain

- A `SupportScreen` component that opens `/embed` in a WebView and passes the user's token,
  `source` and context by message, never in the URL.
- Push token registration and removal helpers.
- Deep-link handling for opening a conversation or an article.
- Native components as an alternative to the WebView come later (build plan phase 9).

See the [build plan](../../docs/helpwren-build-plan.md), sections 4.4, 4.5 and 4.15.

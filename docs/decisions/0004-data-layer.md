# 0004: A data layer in the design system

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Every screen that shows server data needs the same things: a loading state, an empty state, an
error with a retry, paging or infinite scrolling, and caching. Written per feature, these drift
apart and the states that are easy to forget (a failed "load more", a refresh while content is
showing) get skipped.

[ADR 0002](0002-component-layers.md) says `shared` components do no data fetching. That rule
stays: it keeps `base` and `shared` usable anywhere, including in the embeddable widget.

## Decision

Add a fourth layer, `components/data`, above `shared`:

| Layer    | May import                       |
| -------- | -------------------------------- |
| `ui`     | `lib`                            |
| `base`   | `ui`, `lib`                      |
| `shared` | `base`, `shared`                 |
| `data`   | `base`, `shared`, TanStack Query |

It holds `QueryList` and `QueryDetail`. They are generic: the caller passes a `queryKey` and a
`queryFn`, and the component owns the states around the request. They contain no endpoints, no
stores and no business rules.

- **TanStack Query does the fetching and caching.** It is the de facto standard for server state
  in React and already solves request de-duplication, caching by key, background refresh, retries
  and cancellation. It is an optional peer dependency: code that never imports the data layer
  does not need it.
- **Only `data` may import TanStack Query**, and `ui`, `base` and `shared` may not import `data`.
  ESLint enforces both.
- **The app provides the `QueryClientProvider`.** The design system does not create a client, so
  cache lifetime and defaults stay an application decision.
- **Refreshing never replaces content.** With content on screen, loading is a `LinearProgress`
  bar along the top edge; skeletons are only for the first load.

## Consequences

- The design system now has one optional runtime dependency beyond React and Radix.
- Feature code reaches for `QueryList` and `QueryDetail` instead of hand-writing state handling,
  and can still take full control through the `children` render function.
- `Combobox` keeps its own small loader rather than using TanStack Query, so it stays in `base`
  and works without a provider.

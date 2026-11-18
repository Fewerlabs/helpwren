# @helpwren/core

> **Status: stub.** Nothing is implemented yet. This package exists so the workspace layout,
> naming and tooling are settled before product work starts.

Headless client library for Helpwren.

## What it will contain

- Sessions: guest sessions and identified users (`identify`, `reset`).
- Conversations and messages: list, create, send, and live subscriptions to replies.
- Articles: find by filter and search.
- Unread counts for badges.

No interface code lives here. The official widget, support screen and inbox are built only on
this library, so anything they can do a custom interface can do too.

See the [build plan](../../docs/helpwren-build-plan.md), section 4.13 (layer 2, client library) and section 4.15.

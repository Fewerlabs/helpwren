# Context

Tell your team where someone was and what they were doing when they wrote.

```js title="app.js"
Helpwren.setContext({ plan: "pro", orderId: 1234, page: "Checkout" });
```

The values are sent with the next conversation the visitor starts, and the team sees them in the
conversation's details as **From the page**. Call `setContext` again whenever they change, such
as on each page of a single-page app.

- Pass up to 20 plain values: strings of up to 500 characters, numbers, booleans or `null`,
  under names of up to 60 characters.
- A mobile app passes the same through the `context` prop of
  [`SupportScreen`](../mobile/index.md).
- `setContext` can be called before `init`; the chat receives it once it has loaded.

> [!NOTE]
> Context is the page's word, not a fact your install has checked. Anything that must be
> trusted, such as the user's plan, belongs in a [signed token](signed-token.md)'s `attributes`
> or your [profile endpoint](profile-endpoint.md)'s mapping.

The chat also records the page's address and title with every conversation on its own, and, with
**Track visitors** on, the browser, device and location. See
[Visitors and online status](../chat/visitors.md).

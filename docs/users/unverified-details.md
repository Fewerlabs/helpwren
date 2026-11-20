# Unverified details

Pass a logged-in person's name and email to the chat without any server work.

When your page knows who someone is, pass what you know without a token:

```js title="app.js"
Helpwren.init({ source: "web" });
Helpwren.identify({ id: "user_1002", name: "Ada Lovelace", email: "ada@example.com" });
```

This only fills in the start form for them and labels the visitor for your team: `name` and
`email` go into the form, and `id` is passed along with the conversation as context
(`claimedUserId`). They stay a guest, their history stays on this device, and the team sees them
as unverified.

> [!WARNING]
> Unverified details unlock nothing. Typing someone else's email into the console only
> mislabels your own chat, so your team should never treat these labels as proof.

Every install accepts these labels, whatever **Settings → Identity** says.

To have the install confirm who someone is, give `identify` a token instead: see
[Signed token](signed-token.md) or [Profile endpoint](profile-endpoint.md).

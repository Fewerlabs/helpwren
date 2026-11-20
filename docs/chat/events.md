# Events

Run your own code when the chat opens, closes, loads, signs in or has unread replies.

`Helpwren.on(event, listener)` listens for an event and returns a function that stops listening.

| Event      | When                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ready`    | The chat has loaded.                                                                                                                                                           |
| `open`     | The chat was opened, by the visitor or by your code.                                                                                                                           |
| `close`    | The chat was closed.                                                                                                                                                           |
| `unread`   | The number of unread messages changed. The listener is given the number.                                                                                                       |
| `identity` | The chat signed in as your user, went back to a guest, or could not sign in. The listener is given `{ state: "user" }`, `{ state: "guest" }` or `{ state: "failed", reason }`. |

`reason` is `expired` (the token ran out, even after asking for a fresh one), `rejected` (your
install refused it), `off` (the install does not identify users) or `error` (it could not be
checked, for example because your profile endpoint did not answer). After `expired`, `rejected`
or `off` the chat goes back to a guest; after `error`, whoever was signed in stays.

```js title="index.html"
const stop = Helpwren.on("unread", (count) => {
  document.querySelector("#help-badge").textContent = count > 0 ? String(count) : "";
});

Helpwren.on("identity", (identity) => {
  if (identity.state === "failed") console.warn("Support chat sign-in failed:", identity.reason);
});

// Later, to stop listening:
stop();
```

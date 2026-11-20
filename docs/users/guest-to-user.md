# From guest to user

Keep a guest's conversations when they log in, so nothing they wrote is lost.

When the chat on a device is a guest's and the page then calls `identify` with a token, the
install signs the chat in as that user and hands everything the guest wrote over to them:

- the guest's conversations, which move into the user's organisation if they have one;
- their messages, ratings and the history of who did what;
- their name, email and phone number, but only where the user has none of their own.

The guest contact is then deleted, so the team sees one person with one history. Your
install's identity mode decides how the token is checked: a [signed token](signed-token.md) or
the [profile endpoint](profile-endpoint.md).

## In practice

1. A visitor writes from your public site as a guest.
2. They log in to your app on the same browser. Your app's pages call
   `Helpwren.identify({ token })`.
3. The chat is now theirs as a user, with the earlier conversation in it, on this device and
   every other one where they log in.

The hand-over happens in the same browser. Browsers keep the chat's storage separately for each
site it is embedded in, so a public site and an app on two hostnames of one site, such as
`example.com` and `app.example.com`, share the guest's chat. Two different sites, such as
`example.com` and `example.org`, do not.

## Logging out

Call `Helpwren.reset()` when someone logs out of your product. The chat goes back to a fresh
guest, and a page that loads without `identify` shows a guest's chat too, so nobody stays signed
in to support after leaving your product.

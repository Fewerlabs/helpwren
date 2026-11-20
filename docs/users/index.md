# Know your users

Choose how much the chat knows about the people who write, from anonymous guests to verified
users.

By default everyone who writes is a guest. There are three levels:

| Level                                       | What you do                                               | What it gives                                                |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| [Guests](guests.md)                         | Nothing                                                   | Chat for anyone. History stays on the device they wrote from |
| [Unverified details](unverified-details.md) | `identify({ id, name, email })`, no server work           | The form filled in for them, and a label for your team       |
| Verified users                              | `identify({ token })`, and set up **Settings → Identity** | History on every device, their organisation, nothing to type |

A verified user is signed in with a token your install checks, in one of two ways:

- **[Signed token](signed-token.md)**: your server signs a short JWT with a key from your
  install. A few lines of server code.
- **[Profile endpoint](profile-endpoint.md)**: the page hands over the access token your app
  already has, and the install asks your product's "who am I" address whose it is. No new code
  on your server.

When a guest logs in, what they wrote as a guest on that device becomes theirs: see
[From guest to user](guest-to-user.md). Whatever the level, a page can pass
[context](context.md), such as the plan or order someone is looking at.

## Identify users on every page

```html title="app.html"
<script>
  Helpwren.init({ source: "web_app" });
  // A function, so a fresh token can be fetched if one expires.
  Helpwren.identify({ token: () => fetch("/api/support-token").then((r) => r.text()) });

  // When they log out:
  Helpwren.reset();
</script>
```

Call `identify` straight after `init` on every page where someone is logged in. A page that
loads without it shows a guest's chat, even if a user was signed in there before, so someone who
logs out of your product does not stay logged in to support. The
[`identity` event](../chat/events.md) says whether signing in worked.

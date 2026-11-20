# Signed token

Sign users in to the chat with a short JWT that your server signs with a key from your install.

## Before you start

- An admin account on your install.
- A server that knows who is logged in and can sign a JWT. Any JWT library works; the examples
  use [`jose`](https://github.com/panva/jose) for Node.

## Set it up

1. In **Settings → Identity**, under **Identify visitors by**, choose **Signed token, from your
   server**.
2. Under **Signing keys**, choose **Make a signing key**. Copy the secret straight away: it is
   shown once. Keep it in your server's environment, for example as `HELPWREN_SIGNING_SECRET`.
3. Add a route to your server that returns a token for the user who is logged in:

   ```ts title="app/api/support-token/route.ts"
   import { SignJWT } from "jose";

   export async function GET() {
     const user = await getLoggedInUser(); // your own session lookup
     const token = await new SignJWT({ name: user.name, email: user.email })
       .setProtectedHeader({ alg: "HS256", kid: "key_1a2b3c4d" })
       .setSubject(String(user.id))
       .setExpirationTime("10m")
       .sign(new TextEncoder().encode(process.env.HELPWREN_SIGNING_SECRET));
     return new Response(token);
   }
   ```

4. On every page where someone is logged in, hand the chat a function that fetches it:

   ```js title="app.js"
   Helpwren.init({ source: "web" });
   Helpwren.identify({ token: () => fetch("/api/support-token").then((r) => r.text()) });

   // When they log out:
   Helpwren.reset();
   ```

5. Check a real token in **Test a token** at the bottom of the Identity page. It shows what the
   install read from it, and signs no one in.

**Settings → Identity → On your pages** shows the same code with your key's id filled in.

> [!WARNING]
> Never sign a token in the browser, or ship the secret in a mobile app. Anyone holding the
> secret can sign in as any of your users.

## Token format

The token is a JWT signed with HS256. Any other algorithm is refused.

| Claim        | Required | What it is                                                                                        |
| ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `sub`        | Yes      | Your id for the user, 1 to 200 characters. `user_id` is accepted instead                          |
| `exp`        | Yes      | When it runs out, at most 24 hours ahead. A few minutes is plenty                                 |
| `name`       | No       | Up to 200 characters                                                                              |
| `email`      | No       | A valid address, up to 320 characters                                                             |
| `org`        | No       | `{ id, name }`, each up to 200 characters. People in one organisation share conversations         |
| `audience`   | No       | What kind of user this is, such as `business`, up to 100 characters                               |
| `attributes` | No       | Up to 50 values shown to your team, each a string (up to 500 characters), number, boolean or null |

The header's `kid` names the key that signed it. Without one, every key is tried. `aud` and `iss`
are not checked. Clocks may differ by up to a minute.

## Rotate a key

An install holds at most two signing keys, so you can rotate without downtime:

1. Make a second key, and deploy your server with its secret and `kid`.
2. Once every server signs with the new key, remove the old one. Its tokens stop working at once.

## When a token runs out

Because `identify` was given a function, the chat asks it for a fresh token once when one has
expired. If the fresh one fails too, the [`identity` event](../chat/events.md) reports
`{ state: "failed", reason: "expired" }` and the chat goes back to a guest.

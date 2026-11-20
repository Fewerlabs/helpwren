# Profile endpoint

Sign users in to the chat with the access token your app already has, checked against your own
"who am I" address.

The page hands the chat your user's access token. Your install calls your product's profile
address with it, from its server, and reads who the user is from the answer through a mapping you
set. No new code on your server.

## Before you start

- An admin account on your install.
- An address in your product that answers `GET` with the logged-in user as JSON when called with
  `Authorization: Bearer <token>`, such as `https://api.example.com/me`. It must use HTTPS;
  plain HTTP is allowed only for `localhost`, `127.0.0.1` and `[::1]`.

## Set it up

1. In **Settings → Identity**, under **Identify visitors by**, choose **Your product's profile
   endpoint**.
2. Under **Profile endpoint**, enter the **Profile address** and map the fields of its answer.
   Paths are dot-separated, such as `data.id`.
3. Paste a real access token into **Test a token** and choose **Test token**. It uses the
   settings on the page, saved or not, shows what it read, and signs no one in.
4. Save, then hand the chat the token on every page where someone is logged in:

   ```js title="app.js"
   Helpwren.init({ source: "web" });
   // The access token your own app already sends to your API.
   Helpwren.identify({ token: () => getAccessToken() });

   // When they log out:
   Helpwren.reset();
   ```

## Field mapping

| Field              | Required | What to enter                                                                              |
| ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| Profile address    | Yes      | The full HTTPS address of your "who am I" endpoint                                         |
| User id            | Yes      | The path to the user's id, such as `data.id`                                               |
| Name               | No       | Up to four paths, separated by commas, joined with spaces: `data.firstName, data.lastName` |
| Email              | No       | The path to the email. An invalid address is dropped                                       |
| Organisation id    | No       | The path to the user's organisation id                                                     |
| Organisation name  | No       | The path to its name                                                                       |
| Audience           | No       | The path to what kind of user this is, such as `data.type`                                 |
| Audience values    | No       | One per line, such as `Business = business`. Values not listed are used as they are        |
| Shown to your team | No       | One per line, such as `Plan = data.plan`. Only strings, numbers and booleans are kept      |

For an answer like this:

```json title="GET https://api.example.com/me"
{
  "data": {
    "id": "1002",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "business": { "id": "b_7", "name": "Analytical Engines", "plan": "pro" }
  }
}
```

the mapping is: User id `data.id`; Name `data.firstName, data.lastName`; Email `data.email`;
Organisation id `data.business.id`; Organisation name `data.business.name`; and Shown to your
team `Plan = data.business.plan`.

## How the install calls it

- `GET <profile address>` with `Authorization: Bearer <token>` and `Accept: application/json`.
- Redirects are refused, the call gives up after 5 seconds, and an answer over 100,000 bytes is
  refused.
- `401` means the token has expired, and `403` that it is refused. Any other error, an answer
  that is not JSON, or a missing user id means the endpoint is unavailable; the chat then keeps
  whoever was signed in.

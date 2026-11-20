# Your own backend

Receive each push as a signed request to your server, and deliver it however you like.

## Set it up

1. In **Settings → Mobile**, turn on **Your own backend** and enter your server's address.
2. Make a signing secret. It is shown once: keep it in your server's environment.
3. Choose the test button. Your server receives a request with `"type": "push.test"`.

## The request

Each push is posted to your server once per conversation:

```json title="POST https://api.example.com/helpwren-push"
{
  "type": "push.reply",
  "id": "6d1f0c2e-…",
  "conversationId": "b3a7…",
  "contact": { "id": "8c41…", "externalId": "user_1002" },
  "title": "Acme",
  "preview": "It went out this morning.",
  "unreadCount": 2,
  "sentAt": "2026-11-19T10:00:00.000Z"
}
```

| Field                | What it is                                                          |
| -------------------- | ------------------------------------------------------------------- |
| `type`               | `push.reply`, or `push.test` from the test button                   |
| `id`                 | A unique id for this push. Use it to ignore a repeat                |
| `conversationId`     | The conversation, to open the support screen on                     |
| `contact.id`         | Helpwren's id for the contact                                       |
| `contact.externalId` | Your own id for the user, when they are one of your logged-in users |
| `title`              | Your brand's name                                                   |
| `preview`            | A short preview of the reply                                        |
| `unreadCount`        | How many replies they have not read                                 |
| `sentAt`             | When it was sent, in ISO 8601                                       |

Answer with any `2xx` status once you have taken it. Anything else, or no answer within ten
seconds, and it is tried again on a later run.

## Verify the signature

Every request carries `helpwren-signature: t=<unix seconds>,v1=<hex>`, an HMAC-SHA256 of
`<t>.<body>` under the secret. Check it against the raw body, and refuse anything over five
minutes old:

```js title="verify.js"
import { createHmac, timingSafeEqual } from "node:crypto";

function fromHelpwren(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=")));
  if (!parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest();
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
```

`verifyWebhook` in
[`packages/adapters/src/push/webhook.ts`](../../packages/adapters/src/push/webhook.ts) is the
same check in TypeScript, as the install uses it for [replies by email](../email/replies.md).

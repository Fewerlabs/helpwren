# @helpwren/adapters

> **Status: early.** Identity and push adapters work; email and storage are still to come.

Identity, push, email and storage adapters that connect Helpwren to a host product.

## What it contains

- **Identity, so far:** the `IdentityAdapter` interface, the signed token adapter (a
  short-lived HS256 token from the product's backend) and the profile endpoint adapter (the
  product's own "who am I" address, read through a mapping). The settings schemas are also on
  `@helpwren/adapters/settings`, which the browser can load. See
  [ADR 0014](../../docs/decisions/0014-identity-adapters.md).

- **Push:** the `PushAdapter` interface, Expo, and Firebase Cloud Messaging (HTTP v1, signed
  with the service account's key), plus a signed webhook (`createWebhookPush`, `verifyWebhook`).
  See [ADR 0018](../../docs/decisions/0018-push-notifications.md) and
  [ADR 0019](../../docs/decisions/0019-firebase-and-webhook-push.md).

## What it will contain

- **Identity:** guests only, unverified details, email code, profile endpoint, public key and
  signed token.
- **Push:** Expo, Firebase Cloud Messaging and a signed webhook.
- **Email:** Resend, SendGrid, Postmark and SMTP, plus inbound reply handling.
- **Storage:** Supabase Storage and S3-compatible storage.

Each adapter is a small, documented interface with a universal fallback.

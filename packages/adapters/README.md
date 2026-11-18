# @helpwren/adapters

> **Status: early.** Identity adapters have begun; the rest is still to come.

Identity, push, email and storage adapters that connect Helpwren to a host product.

## What it contains

- **Identity, so far:** the `IdentityAdapter` interface and the signed token adapter (a
  short-lived HS256 token from the product's backend). See
  [ADR 0014](../../docs/decisions/0014-identity-adapters.md).

## What it will contain

- **Identity:** guests only, unverified details, email code, profile endpoint, public key and
  signed token.
- **Push:** Expo, Firebase Cloud Messaging and a signed webhook.
- **Email:** Resend, SendGrid, Postmark and SMTP, plus inbound reply handling.
- **Storage:** Supabase Storage and S3-compatible storage.

Each adapter is a small, documented interface with a universal fallback.

# @helpwren/adapters

> **Status: stub.** Nothing is implemented yet. This package exists so the workspace layout,
> naming and tooling are settled before product work starts.

Identity, push, email and storage adapters that connect Helpwren to a host product.

## What it will contain

- **Identity:** guests only, unverified details, email code, profile endpoint, public key and
  signed token.
- **Push:** Expo, Firebase Cloud Messaging and a signed webhook.
- **Email:** Resend, SendGrid, Postmark and SMTP, plus inbound reply handling.
- **Storage:** Supabase Storage and S3-compatible storage.

Each adapter is a small, documented interface with a universal fallback.

See the [build plan](../../docs/helpwren-build-plan.md), section 4.9.

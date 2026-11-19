# 0014: Identity adapters and the signed token

- **Status:** accepted
- **Date:** 2026-11-18

## Context

A product that embeds Helpwren knows who its logged-in users are; Helpwren does not, and must
not take the browser's word for it. Anything the page says can be typed into a console by
someone else. A user's history should follow them across devices, which means the server has to
be sure who is asking before it hands over a session ([ADR 0013](0013-sessions-for-identified-users.md)).

Products differ in how they can prove it. Intercom, Zendesk and Featurebase all ask the
product's backend to sign a short-lived HS256 token with a shared secret; Intercom has
deprecated its older static hash because it never expires. None of them accept asymmetric keys.

## Decision

- **One small interface, in `@helpwren/adapters`.** An identity adapter is
  `verify(token, config)`: it returns who the token belongs to (`VerifiedIdentity`: the
  product's id for the person, and optionally a name, email, organisation, audience and
  attributes) or throws an `IdentityError` saying whether the token was rejected, has expired,
  or could not be checked. Everything after that is the same for every adapter.
- **The first adapter is the signed token.** The product's backend signs a JWT with a secret
  from this install: HS256, an `exp` at most a day ahead, the user's id in `sub` (or `user_id`).
  A token may name its key with `kid`; two keys can be in use at once, so a secret can be
  replaced without logging everyone out. Verification uses `jose`.
- **Whatever a verified token says is trusted, and nothing else is.** The name, organisation
  and attributes come from the token, so they are the product's word. The organisation is
  optional: without one, the person is verified and shares conversations with nobody.
- **`POST /api/identify`** takes the token, runs the install's adapter, signs the user in and
  records them with one database function, `identify_contact`, which only the server may call.
  It marks the contact as a verified user, replaces their details with the product's, and brings
  the organisation on their existing conversations in step.
- **The mode is a setting; the keys are a secret.** `settings.identity` says which adapter is in
  use (`none` by default). The signing keys live in a new `secrets` table that no browser role
  is granted anything on, because every team member can read `settings`.
- **Two new API error codes,** `token_expired` and `token_rejected`, so the chat can tell "fetch
  a fresh token" from "this will never work".

## Consequences

- A token is as good as the user's password for support until it expires. Someone who can run
  script on the host page can take it and read that user's conversations for that long. They
  cannot become anyone else, and they cannot learn the secret. Short expiry is the product's
  lever; a day is the most this install accepts.
- A shared secret means the product's backend and this install both hold something that can
  sign in as anyone. Verifying with a public key avoids that and is a later adapter.
- The route can be called by anyone, with any string. Checking a signature is cheap and nothing
  else happens until it passes, so it is not rate limited yet.
- A guest's earlier conversations are not yet carried over when they are identified. That is the
  next step.
- There is no screen for the mode or the keys yet; they arrive with the Identity settings page.

## Later changes

- 2026-11-19: a guest's conversations follow them when they are identified. The chat sends its
  guest session with the token, and `merge_guest_into_user` moves that guest's conversations,
  messages, ratings and history to the user, fills in a name, email or phone the product did not
  give, and removes the guest. The session is the proof the conversations are theirs to bring:
  the function refuses anyone who is not a plain guest, so another user's or a team member's
  session moves nothing. A session that is sent but cannot be verified fails the request, so the
  chat renews it and asks again instead of quietly leaving history behind. Someone who signs
  another person in on a device where they had been chatting as a guest gives that person their
  guest conversations; that is what merging on sign-in means, and it is the same in Intercom
  and Zendesk.
- 2026-11-19: the widget and the client library can identify. Three choices worth knowing:
  - **The page vouches on every load.** The chat keeps a user's session only while the page that
    embeds it says a user is logged in. Greeted without one, it signs out. That is how a user
    who logs out of the product, or is disabled there, loses support access too, without this
    install being told.
  - **A page load does not cost a new session.** A chat already signed in as the user the token
    is for is told so and keeps the session it has; only their details are refreshed.
  - **Details without a token are labels.** `identify({ id, name, email })` fills the form and
    is shown to the team, and the contact stays an unverified guest. What a page says with
    `setContext` is stored under `context.custom`, apart from what the server itself knows.
    A long-lived tab that is never reloaded keeps its session until it is. Opening a conversation
    from the page (for a push notification) comes with the mobile screen.
- 2026-11-19: a second adapter, the **profile endpoint**, and the Settings > Identity page.
  - The page hands over the token the user already has for the product, and this install calls
    the product's own "who am I" address with it as a bearer token, reading the answer through a
    mapping an admin types in (paths such as `data.id`, a name made of several fields, audience
    values, attributes to show). The product stays the only judge of who is logged in and needs
    no new code. It suits a product whose tokens are signed with a secret it cannot share.
  - The address must be HTTPS, except to this machine; redirects are refused, because following
    one would hand the user's token to wherever it pointed; the product has five seconds. A 401
    is reported to the page as expired, so it fetches a fresh token; a 403 as rejected; anything
    else as `identity_unavailable` (503), and then the chat keeps whoever is signed in, because
    being unable to ask is not the same as being told no.
  - Signing keys are made on the Identity page and kept in `secrets`. A key's secret is shown
    once, when it is made, and never again; two can be in use so one can be replaced. Removing a
    key turns its tokens away at once. With the signed token chosen and no key yet, the install
    identifies nobody.
  - An admin can test a token against the settings on the page, saved or not. It runs the same
    check the chat does, signs no one in and keeps nothing.
  - The settings schemas are on `@helpwren/adapters/settings`, an entry point the browser can
    load without the adapters' server code.

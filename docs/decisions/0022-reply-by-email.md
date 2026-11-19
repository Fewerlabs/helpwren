# 0022: Reply by email

- **Status:** accepted
- **Date:** 2026-11-19

## Context

[ADR 0015](0015-email.md) emails a contact a reply they have not read and a change to their
ticket. Most people answer an email by pressing Reply, so the answer should land in the same
conversation, as it does in Intercom, Zendesk and Help Scout. Helpwren is self-hosted: it cannot
run a mail server for every install, and it must not let an email address become a way to write
into somebody else's conversation.

## Decision

- **A signed reply address per email.** Settings > Email has a reply address, such as
  `reply@support.example.com`. Each email to a contact sets `Reply-To` to
  `reply+<token>@support.example.com`. The token is 27 bytes in lowercase base32 (44 characters,
  inside the 64 a local part may have, and safe from servers that change case): a key version,
  the conversation's id, and an HMAC-SHA256 of the version, the conversation and its contact, cut
  to 80 bits. Guessing one means sending around 2^79 emails. The key is made on first use and
  kept in `secrets` (`email_reply_keys`), with its version, so a newer key can sign new emails
  while older ones keep working.
- **Threads in the mail app.** Every email about a conversation has its own Message-ID and points
  at one root, `helpwren.<conversation>@<domain>`, through `In-Reply-To` and `References`, so mail
  apps group them. This is added whenever there is a domain to use, not only with replies on.
  Each email that can be answered says "Reply to this email, or continue in the chat."
- **Mail reaches the app through an inbound adapter**, in `@helpwren/adapters/inbound-email`.
  One interface: `verify(request)` checks the request came from the provider, and `parse` turns
  it into one shape: from, every recipient (To, Cc, Bcc and the delivered-to addresses), subject,
  text, HTML, Message-ID, In-Reply-To, References, and attachments as metadata with a function
  that fetches the bytes when they are wanted. Three to begin with:
  - **Resend.** A domain whose MX record points at Resend, and a webhook for `email.received`.
    The webhook carries only metadata, so the words and headers are read from
    `GET /emails/receiving/{id}` and files from `GET /emails/receiving/{id}/attachments`, whose
    download links last an hour, with an API key (one saved in Settings, or the server's
    `RESEND_API_KEY`). Requests are signed by Svix: HMAC-SHA256 of `<svix-id>.<svix-timestamp>.<body>`
    under the base64 part of the `whsec_` secret, one of several `v1,<base64>` signatures,
    turned away after five minutes.
  - **Postmark.** Its inbound stream posts the whole email, files included, as JSON. Postmark
    does not sign webhooks; it recommends basic auth over HTTPS, so the webhook address carries a
    secret made in Settings as its password: `https://postmark:<secret>@…`. The sender's own
    Message-ID is read from the headers, because Postmark's `MessageID` is its own.
  - **Generic.** Any provider or mail-to-webhook bridge posts the parsed email as JSON, files
    inline in base64, signed like Helpwren's other webhooks: `helpwren-signature: t=<seconds>,
v1=<hex HMAC-SHA256 of "<t>.<body>">` ([ADR 0019](0019-firebase-and-webhook-push.md)).
  - **IMAP polling**, for a mailbox at any host, is phase 7. It will be a second kind of source
    yielding the same `InboundEmail`; nothing in the route depends on webhooks beyond `verify`.
- **One route, `POST /api/email/inbound/[provider]`**, live only for the provider chosen with
  replies on. A request without the provider's proof gets 401. After that the answer is 200
  with `{ outcome: "added" | "duplicate" | "ignored" }`: a provider retries anything else, and
  only the provider ever sees the answer, never the person who wrote. The reason an email was
  ignored goes to the server's log.
- **What the route checks, in order:** a recipient with the reply address's plus part; a token
  that reads; a conversation it names whose contact the signature matches (an unknown
  conversation and a bad signature are the same refusal, so nothing tells whether a
  conversation exists); a Message-ID not seen before; the sender being the contact's address,
  ignoring case.
- **Mail from another address is not added.** The brief allowed keeping it as an internal note.
  It is refused instead and recorded in `inbound_emails` as `wrong_sender`. A forwarded email
  carries a working reply address, so whoever it was forwarded to could otherwise put words in
  front of the team in the contact's conversation, and notes belong to team members, not to
  strangers. The trade-off is that a contact who answers from a second address is not heard;
  showing those to the team, apart from the thread, is a later step.
- **The words are the new ones only.** The text part is preferred; HTML is turned into text by a
  small tokenizer that drops scripts and styles and `>`-quotes blockquotes. Outlook's
  "From: … Sent: …" header and underscore rule are cut first, because Outlook quotes without `>`.
  Then Crisp's [`email-reply-parser`](https://github.com/crisp-oss/email-reply-parser) (MIT, no
  dependencies, about 32 kB, linear-time patterns, about ten languages) removes "On … wrote:"
  quotes and signatures. A fixture set of Gmail, Outlook and Apple Mail replies, plain and HTML,
  keeps it honest.
- **Files go through the attachments flow** ([ADR 0012](0012-attachments.md)): the private
  bucket, the conversation's folder, five a message, 10 MB each, the same kinds. Inline images
  (a signature's logo) are skipped. A file that does not fit is named at the end of the message,
  "Not attached: setup.exe (this kind of file cannot be sent).", so neither side is left
  wondering.
- **One database function, `receive_email_reply`**, which only the server may call, records the
  email in `inbound_emails` (its Message-ID is unique, so two deliveries at once add one message),
  limits a sender to twenty emails an hour into one conversation, reopens a resolved or closed
  conversation and records that as the contact's doing, and adds the message as the contact with
  `channel = 'email'`. `messages.channel` was there from the start; the stamping trigger sets it
  back to `chat` for anyone signed in, so only the server can say `email`. The usual triggers do
  the rest: the unread count, the preview, live updates and the team's notifications. The emails
  queued from messages are for agents' replies only, so a contact's email never sends an email
  back.
- **Reopening a closed conversation is deliberate.** A chat message reopens only a resolved one;
  the status email tells the contact that writing back opens it again, so an emailed reply does.
- **The inbox says so.** A message that came by email has "via email" with an envelope under it,
  in the inbox and in the contact's chat, and `conversations.via_email` lets the details panel say
  "Also replied by email" without reading the thread.
- **Settings > Email** has the switch (off by default), the reply address, the provider, the
  webhook address with a copy button, the provider's secret (made here and shown once, or pasted
  from Resend and never shown again), a short checklist per provider, and when the last reply
  arrived.

## Consequences

- An adopter needs a domain whose mail goes to their provider: an MX record for a subdomain such
  as `support.example.com` pointed at Resend or at `inbound.postmarkapp.com`. Mail to their main
  domain is untouched.
- Anyone who has one of a contact's emails can write into that conversation as the contact,
  from the contact's own address. That is what an email reply means; a forged From header is the
  provider's spam and authentication checks to catch, and the rate limit caps the damage.
- A token is tied to the conversation's contact. When a guest's conversations move to a user on
  sign-in ([ADR 0014](0014-identity-adapters.md)), emails sent to the guest before then stop
  being answerable. A new email after the move carries a working address.
- There is no "Send a test" for receiving: a test needs a conversation and a real round trip
  through the provider. The page shows when the last reply arrived instead, and the setup guide
  shows how to post a sample with curl.
- The adapters have been tested against recorded sample payloads from the providers' documents,
  not the live services.

## References

- Resend: [receiving email](https://resend.com/docs/dashboard/receiving/introduction),
  [the `email.received` webhook](https://resend.com/docs/dashboard/receiving/create-receiving-webhook),
  [retrieve a received email](https://resend.com/docs/api-reference/emails/retrieve-received-email),
  [list its attachments](https://resend.com/docs/api-reference/emails/list-received-email-attachments),
  [verifying webhooks](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests).
- Svix: [verifying payloads by hand](https://docs.svix.com/receiving/verifying-payloads/how-manual).
- Postmark: [inbound webhook](https://postmarkapp.com/developer/webhooks/inbound-webhook),
  [webhooks overview](https://postmarkapp.com/developer/webhooks/webhooks-overview) (basic auth
  and IP ranges; 403 stops retries).

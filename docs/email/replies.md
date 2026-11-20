# Replies by email

Let contacts answer an email from their mail app, with the answer landing in the same
conversation.

Each email Helpwren sends has a `Reply-To` address with a signed part after a plus, such as
`reply+k7f…@support.example.com`. The part tells your install which conversation the reply
belongs to, and nobody can write into someone else's.

## Before you start

- [Sending email](index.md) set up.
- A domain your mail provider receives mail for, such as `support.example.com`.
- One of: Resend with receiving turned on, Postmark inbound, or any provider or bridge that can
  post each email as JSON.

## Set it up

1. In **Settings → Email → Replies by email**, turn on **Let contacts reply by email**.
2. Enter a **Reply address** on your receiving domain, such as `reply@support.example.com`.
3. Under **Received by**, choose your provider and follow the checklist the page shows for it.
   The page also shows the webhook address to paste into the provider.

| Provider         | What to do                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend           | Add the domain in Resend, turn on receiving and add its MX record. Add a webhook for `email.received`, and paste its signing secret. Replies are read through Resend's API, with the server's `RESEND_API_KEY` or a key saved on the page |
| Postmark         | Point the domain's MX record at `inbound.postmarkapp.com` and set it as the inbound domain. Make a secret on the page and paste the webhook address, which carries it                                                                     |
| Another provider | Make a secret, and have your provider or bridge post each email as JSON, signed like the sample on the page                                                                                                                               |

4. Send yourself an email from a conversation, reply to it from your mail app, and check that the
   reply shows in the inbox marked **via email**.

Replies from blocked contacts are recorded but not added. A conversation takes at most 20 email
replies an hour.

## Signed JSON from another provider

The request body is JSON with `from`, `to`, `subject`, `text` and `messageId`, signed with the
`helpwren-signature` header the same way as [push webhooks](../mobile/webhook.md#verify-the-signature).
To try it without a provider, post an email by hand:

```bash title="Terminal"
SECRET='whsec_…'   # shown once, when you made it
TO='reply+<token>@support.example.com'   # the Reply-To of an email the contact was sent
BODY=$(jq -nc --arg to "$TO" '{
  from: "Visitor <visitor@example.org>",
  to: [$to],
  subject: "Re: New reply",
  text: "Thanks!\n\nOn Wed, 19 Nov 2026, Support <\($to)> wrote:\n> Your earlier reply",
  messageId: "<try-1@example.org>"
}')
T=$(date +%s)
SIG=$(printf '%s.%s' "$T" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')
curl -X POST https://support.example.com/api/email/inbound/generic \
  -H 'Content-Type: application/json' -H "helpwren-signature: t=$T,v1=$SIG" -d "$BODY"
```

The answer is `{"outcome":"added"}`, and "Thanks!" shows in the inbox, without the quoted earlier
reply. Posting it again answers `duplicate`; a wrong token answers `ignored`, with the reason in
the app's log.

> [!NOTE]
> Fetching replies from a mailbox over IMAP is not supported. Use a provider that posts incoming
> email to a webhook.

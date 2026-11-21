# Guests

Let anyone chat, with no sign-in and no work on your side.

With only the script tag on your page, everyone who writes is a guest.

- **Opening the chat creates nothing.** A guest is made when they send their first message: an
  anonymous Supabase user, with a session kept in the browser's own storage for your install.
  Page views do not fill the database with guests who never wrote.
- **What a guest gives.** **Settings → General → Ask guests for** decides what the chat asks
  before the first message: a name and email (the default), a name and phone number, a name and
  either, or nothing.
- **Their history stays on that device.** A guest sees their earlier conversations in the chat
  on the same browser, even if the browser lost their session (see
  [Returning guests](../chat/returning-guests.md)). On another device, or after clearing site
  data, they start afresh. To carry history across devices, sign them in as a
  [verified user](index.md).
- **Your team sees them as guests.** Under **Contacts**, the Guests segment lists them. Their
  details are what they typed, so treat them as unconfirmed.

Guest chat invites spam, so it comes with limits: rate limits per network, spam checks on
messages, blocking, and an optional captcha. See
[Security and abuse protection](../security/index.md).

> [!NOTE]
> Supabase limits anonymous sign-ins to 30 an hour per IP address by default, which a busy
> office behind one address could reach. Raise it in Supabase under **Authentication → Rate
> Limits** if it does.

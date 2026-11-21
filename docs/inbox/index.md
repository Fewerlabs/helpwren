# The inbox

Answer conversations, find contacts and see who is on your site, from the dashboard.

The dashboard is at `https://support.example.com/dashboard`. Team members sign in with their
email and a password, or a six-digit code sent to that email.

## Views

| View         | What it lists                                        |
| ------------ | ---------------------------------------------------- |
| My inbox     | Conversations assigned to you                        |
| Unassigned   | Conversations nobody has taken yet                   |
| All          | Every conversation                                   |
| Tickets      | Every ticket, as a table                             |
| One per team | Conversations assigned to that team, such as Billing |

**Show** filters any view by status: Open, Waiting, Resolved (with Closed), or All.

## Search

**Search conversations** finds a ticket by its number, with or without `#`, or any conversation
whose subject, contact name, email, phone number or messages contain at least two characters you
type.

## Answer a conversation

1. Open the conversation. Its details panel shows the contact, the page they wrote from, any
   [context](../users/context.md) as **From the page**, and the visitor's browser and location.
2. Write a reply and press Enter to send. Shift+Enter adds a new line. The contact sees "typing…"
   while you write.
3. Use **Assign to me**, set a team, status or priority, or **Convert to ticket**. See
   [Tickets](tickets.md).
4. Choose **Resolve** when it is done. The contact can then rate the conversation from 1 to 5,
   with a comment.

Switch the composer from **Reply** to **Note** to write something only your team sees.

## Saved replies

Type `/` in the reply box to pick a saved reply; arrow keys move, Enter or Tab inserts, Esc
closes. Write them in **Settings → Saved replies**, for the whole team or just for you, with an
optional shortcut. Placeholders are filled in when you insert one:

| Placeholder             | Becomes                            | When unknown       |
| ----------------------- | ---------------------------------- | ------------------ |
| `{contact.first_name}`  | The contact's first name           | there              |
| `{contact.name}`        | The contact's full name            | there              |
| `{contact.email}`       | The contact's email                | your email address |
| `{agent.first_name}`    | Your first name                    | the team           |
| `{agent.name}`          | Your full name                     | the team           |
| `{brand.name}`          | Your brand's name                  | our team           |
| `{conversation.number}` | The ticket number, such as `#1042` | this conversation  |

## Contacts

**Contacts** lists everyone who has written, in three segments: Everyone, Users and Guests.
Search by name, email or phone, and filter by country, device, last seen, whether they have
written, and whether they are verified. A contact's page shows their details and conversations,
and lets you **Block** them, or **Block with their network**. See
[Security and abuse protection](../security/index.md#blocking).

## Visitors

**Visitors** lists who is on your site right now: name, location, page, time on site, device and
whether they have chatted. Open one to see the pages they visited and write to them first. It
needs **Track visitors** and **Live visitors** on in **Settings → General**. See
[Visitors and online status](../chat/visitors.md).

## Notifications

In **Settings → Notifications**, each person chooses desktop notifications, a sound, and whether
to hear about every conversation or only their own and unassigned ones. These are kept per
browser.

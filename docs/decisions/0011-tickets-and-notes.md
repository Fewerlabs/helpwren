# 0011: Tickets, assignment and internal notes

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Some conversations need tracking after the chat ends: a refund, a bug, anything that takes days
and more than one person. The team also needs to say things to each other on a conversation
that its contact must never see.

## Decision

- **A ticket is a conversation.** It is the same row and the same thread, with `type = 'ticket'`,
  a number and a subject. Nothing is copied, so the history is whole and a contact has one place
  to look.
- **Tickets live in the inbox, not in a section of their own.** They are an inbox view, beside
  My inbox, Unassigned, Open, Waiting, Resolved and All. A view is a filter on type, status and
  assignee, in the address.
- **The database gives the number.** A trigger takes the next value of a sequence when a chat
  becomes a ticket. Nothing a client sends can set a number, change one, or turn a ticket back
  into a chat: people quote ticket numbers, so they must never move.
- **Agents change status, priority and assignee directly,** under the access rule that already
  let agents update conversations. Contacts cannot, and for them a change simply finds nothing.
  A contact can read their own ticket's number, subject and status.
- **The open conversation is loaded by its id,** not looked up in the list on screen, so it
  stays open when a change such as resolving takes it out of the current view.
- **Notes are a separate table,** as before, so no access rule can ever show one to a contact.
  They are shown among the messages on the team's side only, and written from the reply box in
  a mode that looks different from a reply.
- **Notes have their own live channel,** `notes:<conversation id>`, for agents only. They must
  not travel on the conversation's channel, which its contact may listen to.

## Consequences

- A ticket cannot be undone. A conversation converted by mistake stays a ticket; it can be
  resolved or closed.
- Ticket numbers have gaps only if a database transaction that took one is rolled back.
- Every agent can change any conversation. There are no per-team or per-agent permissions.
- The contact is not told when their conversation becomes a ticket or changes status. That
  belongs with notifications and email.
- The reply box has two modes one click apart. The note mode is tinted and dashed so a note is
  not mistaken for a reply, but the risk of writing in the wrong one is real.

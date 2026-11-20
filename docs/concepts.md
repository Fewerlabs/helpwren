# Concepts

The terms used across these docs and the dashboard.

## Install

One running copy of Helpwren: the app, its Supabase project and its settings. A product has one
install, on an address such as `https://support.example.com`. Nothing is shared between
installs.

## Source

Where a conversation comes from, such as `web` for your website or `customer_app` for a mobile
app. A page passes it to `Helpwren.init({ source })`, and a mobile app to `SupportScreen`. An
install accepts only the sources it knows; a new one starts with `web`.
[Adding a source](mobile/index.md#add-a-source) shows how to add another.

## Contact

Anyone who has written: a guest or a user. The team sees contacts under **Contacts**.

- **Guest**: a visitor your product has not vouched for. Their chat history stays on the device
  they wrote from. A guest can still be labelled with a name and email, but the team sees them as
  unverified. See [Guests](users/guests.md).
- **User**: a person your product has signed in to the chat with a token, through a
  [signed token](users/signed-token.md) or your [profile endpoint](users/profile-endpoint.md).
  Their history follows them to every device.

## Organisation and audience

A user can belong to an **organisation** of yours, such as a company account. People in the
same organisation see each other's conversations. The **audience** says what kind of user they
are, such as `customer` or `business`, and is shown to the team.

## Conversation and ticket

A **conversation** is a thread of messages between a contact and your team. It has a status:
Open, Waiting, Resolved or Closed. A **ticket** is a conversation that also has a number (such as
`#1042`), a subject, a priority, an assignee and a team. The team can turn any conversation into
a ticket, and a contact can submit one from the chat if you allow it. See
[Tickets](inbox/tickets.md).

## Note

A message in a conversation that only the team can see.

## Team member, agent and admin

People who answer. Every team member is an **agent** or an **admin**. Agents answer
conversations and write saved replies; admins also change the workspace settings and the team.
Members can be grouped into **teams**, such as Billing, and the inbox has a view for each.

## Collection and article

The help center is made of **articles**, grouped into **collections**. An article is public, or
shown only in the chat (**Chat only**), and can be featured on the chat's home screen. See
[Collections and articles](help-center/index.md).

## Allowed domains

The sites that may show your chat and your embedded help center. With none set, any site may.
See [Allowed domains](security/allowed-domains.md).

## Context

Facts a page or app passes along with a conversation, such as the plan someone is on or the
screen they were looking at. The team sees them as "From the page". See
[Context](users/context.md).

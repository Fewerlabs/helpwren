# 0012: File attachments

- **Status:** accepted
- **Date:** 2026-11-18

## Context

People need to send more than words: a screenshot of the problem, an invoice, a label. Both
sides of a conversation should be able to, and nobody outside it should be able to open what
was sent.

## Decision

- **Files live in a private storage bucket, one folder per conversation.** A file's path starts
  with its conversation's id. The access rules on the bucket look that conversation up, so they
  inherit who may read it: its contact, verified teammates in the same organisation, and agents.
  Its contact and agents may add files. Nobody changes or deletes one, as nobody edits a
  message.
- **A message lists its files in a column**, `messages.attachments`, as
  `{ path, name, type, size }`. A message needs words or a file. A trigger checks that each file
  named is really in that conversation's folder, and takes its type and size from the stored
  file and not from what the sender said.
- **Upload first, then send.** The reply box uploads each file as it is chosen and sends their
  paths with the message, so sending stays quick and a failed upload is reported on its own.
- **Links are signed and short-lived.** The client library asks for links that work for an hour
  and the thread asks again before they run out. Pictures show in the thread; other files are a
  link with a name and a size.
- **Limits:** five files a message, 10 MB each, and a short list of kinds: common images, PDF,
  plain text, CSV, Word and Excel. The bucket enforces the size and kinds; the client library
  checks them first so the person is told at once. HTML and SVG are left out because they can
  carry scripts.

## Consequences

- A file that is uploaded and never sent stays in storage. Nothing shows it, but it takes space
  until a cleanup job removes files no message names.
- Uploads are not rate limited the way messages are. A contact can only write into their own
  conversation's folder, and each file is capped, but a determined one could fill storage. A
  per-contact quota is the fix if it happens.
- The first message of a conversation, sent from the start form, cannot carry a file. Files are
  sent from the reply box once the conversation exists, because the folder is named after it.
- Internal notes are words only.

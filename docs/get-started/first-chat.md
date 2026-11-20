# Your first conversation

Put the widget on a page, write as a visitor, and answer from the inbox.

## Before you start

- An install with a first admin. See [Choose how to install](index.md).
- A page you can edit, or none: the install's own `/chat` page works too.

## Steps

1. **Add the widget to a page.** **Settings → Installation** shows the snippet with your
   install's address in it, for plain HTML, React and Next.js. Paste it into a page, before
   `</body>`:

   ```html title="index.html"
   <script src="https://support.example.com/widget.js"></script>
   <script>
     Helpwren.init({ source: "web" });
   </script>
   ```

   A launcher appears in the bottom corner, and the live check on the Installation page turns
   green: "Seen on example.com just now". Without a page, open
   `https://support.example.com/chat` instead.

2. **Write as a visitor.** Open the page in a private window, click the launcher and choose
   **Send us a message**. By default the chat asks a guest for a name and an email first
   (**Settings → General → Ask guests for** changes this). Send a message.

3. **Answer from the inbox.** In your own window, open `https://support.example.com/dashboard`.
   The conversation is in **Unassigned** and **All**. Open it, write a reply and press Enter.
   The reply appears in the visitor's chat at once, and the visitor sees "typing…" while you
   write.

## Next steps

- [Set the widget's look](../chat/appearance.md) and where it sits.
- [Recognise logged-in users](../users/index.md), so their history follows them.
- [Turn on email](../email/index.md), so a visitor who has left hears about your reply.
- [Invite your team](../inbox/team.md).

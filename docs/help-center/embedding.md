# Embedding

Show the help center inside a page of your own site or app, in a frame that fits its content.

Add `?embed=1` to any help center address and it drops its header, footer and credit, ready for a
frame. **Settings → Installation → Help center** gives the snippet with your address in it.

## Embed it

1. Add the frame and a listener for its height:

   ```html title="support.html"
   <iframe
     id="helpwren-help"
     src="https://support.example.com/help?embed=1"
     title="Help"
     style="width: 100%; min-height: 320px; border: 0"
   ></iframe>
   <script>
     // The help center says how tall it is, so the frame needs no scrollbar of its own.
     window.addEventListener("message", (event) => {
       if (event.origin !== "https://support.example.com") return;
       const message = event.data;
       if (message?.channel !== "helpwren" || message.type !== "help-height") return;
       document.getElementById("helpwren-help").style.height = message.height + "px";
     });
   </script>
   ```

2. If you have set [allowed domains](../security/allowed-domains.md), add the site the frame is
   on. Only those sites can frame the help center.

The frame posts `{ channel: "helpwren", type: "help-height", height }` to the page whenever its
content changes height. It carries a number and nothing else.

## Options

Add these to the frame's address after `embed=1`:

| Option       | What it does                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------- |
| `collection` | Opens on one collection, by its slug: `&collection=getting-started`. Home page only          |
| `q`          | Opens on a search: `&q=refund`. Home page only, up to 200 characters                         |
| `hide`       | Leaves parts out: any of `search`, `collections`, `feedback` and `chat`, separated by commas |
| `accent`     | Your colour as six hex digits, without the `#`: `&accent=1d4ed8`                             |

```html title="One collection, without search or chat"
<iframe
  src="https://support.example.com/help?embed=1&collection=getting-started&hide=search,chat"
  title="Help"
  style="width: 100%; min-height: 320px; border: 0"
></iframe>
```

Options that do not match are ignored.

## In the chat

The chat shows the help center without any embedding: up to three featured articles under
**Suggested articles** on its home screen, and every collection and a search on its Help tab. To
feature an article, turn on **Featured** in the article editor.

On `/help` itself, **Show the chat launcher on help pages** (**Settings → Branding → Help
center**) adds the chat to every help page.

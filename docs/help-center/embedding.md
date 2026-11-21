# Embedding

Show the help center inside any page of your own site or app, with only the parts you want, in a
frame that fits its content.

Add `?embed=1` to any help center address and it drops its header, sidebar, footer and credit,
ready for a frame. It fits any width from 320px up, and tells your page how tall it is.

**Settings → Installation → Embed the help center** builds the snippet for you: tick the parts to
show, see a live preview, and copy the code with your address in it.

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
       const frame = document.getElementById("helpwren-help");
       frame.style.minHeight = "0";
       frame.style.height = message.height + "px";
     });
   </script>
   ```

2. If you have set [allowed domains](../security/allowed-domains.md), add the site the frame is
   on. Only those sites can frame the help center.

The frame posts `{ channel: "helpwren", type: "help-height", height }` to the page whenever its
content changes height: when it first loads, when the reader moves to another page inside it, and
when the frame's width changes. The height is the content's own, so the frame shrinks as well as
grows. The message carries a number and nothing else. With more than one help center frame on a
page, also check `event.source === frame.contentWindow`.

### With the widget script

If your page loads `widget.js`, one call adds the frame and keeps it sized. It needs no `init`, so
it works on pages without the chat too:

```html title="support.html"
<div id="helpwren-help"></div>
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.embedHelp(document.getElementById("helpwren-help"), {
    hide: ["breadcrumbs", "feedback"],
  });
</script>
```

`embedHelp(container, options)` takes the options below by their long names (`hide` as a list,
`collection`, `query`, `padding`, `background`, `theme`, `accent`) and `title` for the frame. It
returns a function that takes the frame away. In a bundled app, `createHelpEmbed(appOrigin,
container, options)` from the [`helpwren`](../packages/helpwren.md) package does the same.

## Choose the parts

Everything shows unless you leave it out with `hide`: a list of parts separated by commas.

| Part          | What it is                                                   | Pages                       |
| ------------- | ------------------------------------------------------------ | --------------------------- |
| `title`       | The heading: "How can we help?", or the collection's name    | Home, collection            |
| `subtitle`    | The line under the heading, and a collection's article count | Home, collection            |
| `search`      | The search box                                               | All                         |
| `collections` | The collection cards                                         | Home                        |
| `popular`     | The featured articles, under **Popular articles**            | Home                        |
| `breadcrumbs` | The way back: Help center › collection › article             | Collection, article, search |
| `related`     | The previous and next articles in the collection             | Article                     |
| `feedback`    | **Was this helpful?**                                        | Article                     |
| `chat`        | **Still need help?** and the link to the chat                | Article                     |

An article's own title and text always show. Names that are not in the list are ignored. The
header, sidebar and footer of the full help center are never in the frame, so there is nothing to
hide there.

The options stay on every link inside the frame, so a reader who opens a collection or an article
stays in the same embedded view.

## Fit your page

| Option       | What it does                                                                             |
| ------------ | ---------------------------------------------------------------------------------------- |
| `padding`    | `compact` for a little room around the content, `none` to sit inside your own padding    |
| `bg`         | What is behind the content: `transparent`, or a colour as six hex digits without the `#` |
| `theme`      | `light` or `dark`, to match your page. Left out, the reader's choice or device decides   |
| `accent`     | Your colour as six hex digits, without the `#`: `&accent=1d4ed8`                         |
| `collection` | Opens on one collection, by its slug: `&collection=getting-started`. Home page only      |
| `q`          | Opens on a search: `&q=refund`. Home page only, up to 200 characters                     |

Options that do not match are ignored.

## Examples

The help home with only the title, the search and the collection cards, inside your own padding:

```html title="app/support"
<iframe
  src="https://support.example.com/help?embed=1&hide=subtitle,popular&padding=none&bg=transparent"
  title="Help"
  style="width: 100%; min-height: 320px; border: 0"
></iframe>
```

One collection, without its breadcrumbs or the search:

```html title="One collection"
<iframe
  src="https://support.example.com/help?embed=1&collection=getting-started&hide=breadcrumbs,search"
  title="Help"
  style="width: 100%; min-height: 320px; border: 0"
></iframe>
```

Add the height listener from [Embed it](#embed-it) to each, or use `Helpwren.embedHelp`.

## In the chat

The chat shows the help center without any embedding: up to three featured articles under
**Suggested articles** on its home screen, and every collection and a search on its Help tab. To
feature an article, turn on **Featured** in the article editor.

On `/help` itself, **Show the chat launcher on help pages** (**Settings → Branding → Help
center**) adds the chat to every help page.

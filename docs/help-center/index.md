# Collections and articles

Write help articles, group them into collections, and publish them at `/help` and in the chat.

The help center is part of every install, at `https://support.example.com/help`. Your team
writes it under **Help center** in the dashboard (`/dashboard/help`).

## Collections

A collection groups articles, such as Getting started or Billing. Each has a name (up to 80
characters), a slug for its address (`/help/billing`), an optional description (up to 300
characters) and an icon. The order you give collections is the order readers see.

## Write an article

1. In the dashboard, open **Help center** and create an article.
2. Write it in the editor. Blocks: text, heading, subheading, bulleted and numbered lists, quote,
   code block, note, tip, warning, video, divider and images. Press Cmd+S or Ctrl+S to save.
3. Fill in the details: title (up to 160 characters), summary (up to 300), collection, slug,
   tags (up to 20), author, and the search engine title and description. See
   [Search engines](seo.md).
4. Choose where it shows, then publish.

| Setting    | Values                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- |
| Status     | Draft, which only the team can read, or Published                                      |
| Visibility | **Help center and chat**, or **Chat only**: left off `/help` and out of search engines |
| Featured   | Shown under **Suggested articles** on the chat's home screen, up to three              |

Images are uploaded as PNG, JPEG, WebP or GIF, up to 5 MB each. Videos are YouTube links,
played through `youtube-nocookie.com`. A draft can be previewed at `/help/preview/<id>` by the
team only.

> [!NOTE]
> A published article needs a collection, and its slug cannot change once published, so links
> to it keep working.

## Where readers find articles

- **`/help`**: the public help center, with a page for each collection and article, and search.
  Your brand, header and footer links come from **Settings → Branding → Help center**.
- **The chat**: the home screen shows up to three featured articles and **Search all
  articles**; the Help tab lists the collections and searches them.
- **Your own site**: [embed the help center](embedding.md) in a page, or
  [serve it at your own `/help`](own-site.md).

## Ratings

Each article ends with **Was this helpful?** Readers answer yes or no. One answer counts per
article, per network, per day.

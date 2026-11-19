# 0016: The knowledge base and the public help center

- **Status:** accepted
- **Date:** 2026-11-19

## Context

A help desk needs answers people can find for themselves: articles the team writes, a public
help center that search engines index, and the same articles inside the chat. The pages are the
customer's, so they wear the customer's brand, and a host site should be able to place them
inside its own pages as well as link to them.

## Decision

### Data

- **Collections and articles**, in tables of those names. An article is in one collection, has a
  status (`draft` or `published`) and a place in its collection's order. The build plan sketched
  `kb_categories` with an article in several of them; one collection keeps an article at one
  address (`/help/{collection}/{article}`), which is what search engines want.
- **What an article carries** follows the established help desks (Intercom, Zendesk,
  Featurebase): title, slug, summary, body, author, tags, a visibility (`public`, or `in_app` for
  the chat only), a featured flag, and a title and description of its own for search engines.
- **Published articles are public.** Anyone, with or without a session, reads a published
  article and a collection that holds one. Drafts are for the team. Every agent writes; this is
  not an admin-only screen. `in_app` decides where an article is listed, not who may read it.
- **Slugs are stable.** A slug is made from the title once and never follows it. An article's
  slug can change while it is a draft; a collection's while it has no published articles. The
  database refuses any other change with the code `HW409`, so no screen can break a link.
- **A collection cannot be removed while it holds articles**, so a published article never
  loses its address by accident.
- **Search is Postgres full-text search**, in `search_articles`: the title weighs most, then the
  summary and tags, then the body. Each word typed matches from its start, so results appear
  while a word is still being typed. It runs with the caller's own access.
- **"Was this helpful?"** is one row per answer in `article_feedback`. Readers add answers and
  read none; the team reads totals through a view. It holds no contact's id, so nothing follows a
  guest who later signs in.
- **Pictures** live in a public `articles` bucket that only the team writes to.

### The body

- **Stored as a document tree (JSON), not HTML or Markdown.** It is the editor's own format, so
  nothing is lost in a round trip, and it is data, not markup.
- **Drawn by a renderer of our own**, `RichText` in the design system, on the server and with
  none of the editor's code. It draws only the kinds of node and mark it knows and follows only
  web, email and phone addresses and paths on the same site. So a body cannot carry a script,
  whatever was written to the database, and the check is where the page is made and not only
  where the article is saved.
- **Search reads the tree** in a generated column that takes every piece of text out of it.

### The editor

- **Tiptap 3**, on ProseMirror. It is MIT licensed, supports React 19 (its peer range is React
  17 to 19), is the most widely used editor of its kind, and its extensions are separate
  packages, so only what is used is loaded. Lexical was the alternative considered: capable, but
  with less ready-made for lists, links and menus. BlockNote and Plate build on the same
  foundations with more opinions about the interface than a design system of our own wants.
- **It works the way Notion does:** no toolbar, a `/` menu of blocks, a bar over selected text,
  Markdown shortcuts, and a plus and a drag grip beside the block under the pointer.
- **Only `RichTextEditor` imports Tiptap.** The drag grip uses Tiptap's drag-handle package,
  which asks for its collaboration packages (and `yjs`) to be installed though nothing here
  collaborates. They load only on the editor's page.
- **Saving is explicit.** Changes to a published article would otherwise go live half typed.
  The page says when there are unsaved changes and asks before they are left behind.

### The public help center

- **Server-rendered at `/help`**: a home page, a page per collection, a page per article, and
  search. Each has a title, a description, a canonical address, Open Graph tags and, where it
  applies, `Article` and `BreadcrumbList` data. `/help/sitemap.xml` lists every page and
  `robots.txt` points to it.
- **Read as a visitor with no session, whoever is asking**, so a signed-in team member sees what
  the public sees, and one answer can be kept for everybody.
- **Kept between requests, not built ahead.** Pages are drawn per request, because a build has
  no database to ask. What they read is kept for five minutes under one tag, and saving an
  article or the branding clears it at once.
- **The address can be someone else's.** When the help center is served through a rewrite on
  the customer's own site, the `help_center.url` setting is the canonical address of every page.
- **It follows the device's light or dark setting**, with a button to switch.

### Embedding

- **`?embed=1` gives the content without the header, footer and credit**, for a frame on a
  host's page. It fills the frame, with a minimum size.
- **Options are few and checked strictly** (`lib/help-embed.ts`): `collection=` and `q=` choose
  where to open, `hide=` leaves out `search`, `collections`, `feedback` or `chat`, and `accent=`
  takes six hex digits and nothing else. Anything that does not match is dropped.
- **The proxy decides.** It checks the address, sets which sites may frame the page (the
  install's allowed domains, as for the chat), and passes what it accepted to the pages in a
  header it always sets or removes itself.
- **The frame reports its height** to the page around it:
  `{ channel: "helpwren", type: "help-height", height }`. It holds a number and nothing else, so
  it is sent to whichever site is framing.

## Consequences

- An article in two collections is not possible. A second collection would need a link table
  and a rule for which address is canonical.
- There is no draft of a published article: editing one and saving changes what visitors read.
- Feedback and uploads are not rate limited. Each is narrow (one row; one image, by the team
  only), but a determined visitor could add many answers.
- The public pages do not name an article's author, because visitors cannot read the team.
- View counts, audiences, languages and rules that map a host page to articles are not built.
- A new node type has to be added in three places: the editor, the renderer and the schema in
  `packages/core/src/rich-text.ts`.

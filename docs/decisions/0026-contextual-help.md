# 0026: Contextual help

- **Status:** accepted
- **Date:** 2026-11-20

## Context

Section 4.7 of the build plan asks for the help articles that fit the page a visitor is on:
chosen by a filter the page sets or by rules the team keeps, and shown in the chat, inside the
host's page, or in a list the host draws itself. [ADR 0016](0016-knowledge-base.md) left out
audiences, languages and rules that map a page to articles.

## Decision

### What an article carries

- **Collections stand for the plan's categories.** An article stays in one collection, as ADR
  0016 decided; a filter may name several collections.
- **Three new columns:** `audiences text[]` (empty means everyone), `locale` (null means not
  tied to a language) and `fields jsonb`, a flat object of short text values under plain keys,
  checked in the database so a filter can match it by containment. Tags already existed.

### The filter

- **One typed shape,** `articleFilterSchema` in `@helpwren/core`, checked wherever a filter
  arrives: the chat, the API, the rules editor. The widget, which depends on nothing, keeps a
  plain TypeScript copy in `protocol.ts`.
- **Evaluated in the database** by `find_articles(filter jsonb, any_word boolean)`, over
  published articles only, with the caller's own access. It reuses the articles' full-text
  column and prefix matching. Pinned articles come first; with nothing else in the filter, they
  are all there is. `popular` sorts by how many readers found an article helpful, read through a
  small security-definer function in `private` that returns a count and nothing else, since
  readers cannot read the answers and no public function may run as definer.
- **The visitor's audience is the server's word.** The chat's request carries its session; the
  server reads the audience of a verified contact and fills it into a filter that names none. A
  page may still set `audience` itself.

### Rules

- **A table, `help_rules`:** a name, a way to match (`is`, `matches` with `*`, `contains`), the
  value, an optional audience, the filter, on or off, and a position. Agents read them, admins
  write them, as with settings. The screen lives in Settings, laid out like Saved replies: a
  table with drag handles, a dialog to edit one, and a box to try an address.
- **Matching is done by the app,** in `matchHelpRule` in `@helpwren/core`, not in SQL. It is
  unit tested there, and the dashboard's test box runs the same code as the chat.
- **Resolution:** the page's filter wins; otherwise the first enabled rule that matches. When
  that finds nothing, or nothing applies, the server searches the filter's words or the page's
  title with any word counting, unless `contextualHelp.fallback` is off. A title is rarely all
  in one article, so all words counting would rarely find anything.

### Showing it

- **In the chat, "Help for this page" leads the home screen, above "Suggested articles",**
  which drops any article already listed. Page help is about what the visitor is doing now;
  the featured articles are the team's choice for everyone and still deserve a place, so the
  page's help goes first rather than replacing them.
- **Inline blocks are plain markup in the host's own DOM,** not a shadow root: a list of links
  with stable class names the site styles, so it reads as part of the page. Nothing is drawn
  while loading or when empty, so only the list itself moves the page. A plain click opens the
  article in the chat; a modified click, or a page without the chat, follows the link.
- **Public endpoints:** `GET /api/articles` and `POST /api/articles/search`, returning
  `{ title, summary, slug, url }`. Browsers may read them only from the allowed domains (the
  same check as framing the chat); requests without an `Origin` are answered. They are rate
  limited per network and sent with `Cache-Control: public, max-age=60`.
- **The chat's own endpoint,** `POST /api/articles/contextual`, answers only the install's
  origin and says what applied, so the start form can save it in the conversation's context as
  `help`. The server names a rule from its id rather than trusting the browser's name.

### Caching

- **The rules and settings are kept for a minute** under the help center's tag, which saving a
  rule, the fallback or an article clears. **The articles are asked for each time:** a filter
  is a small indexed query, and an article added outside the app then shows at once. Caching
  every filter's answer would have meant a key per filter and stale answers after direct
  database changes.

## Consequences

- An article belongs to one collection, so "categories" are a single choice per article.
- Field values are compared as text; numbers and true or false in a filter are turned into the
  text they print as.
- A rule's filter that a later version cannot read is kept but never matches, and the table says
  so.
- Article opens are not yet counted by filter or rule, so there is no report of where help
  content is thin. It needs a table of events and a place to show them.
- Each chat page view asks the database once for its help, besides the rules kept for a minute.

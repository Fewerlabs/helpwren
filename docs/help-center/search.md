# Search

Readers search every published article from the help center and from the chat.

## Where search appears

- **Help center**: the search box on `/help`, and Cmd+K or Ctrl+K on any help center page. A
  search has its own address, `/help/search?q=refund`, which search engines are told not to
  index.
- **Chat**: **Search all articles** on the home screen and the search on the Help tab, which
  shows up to 20 results.
- **Embedded help center**: open it on a search with `q=`. See [Embedding](embedding.md).

## How results are found

Search runs in Postgres full-text search, in English, and matches the start of words, so
`refu` finds "refund". Matches in the title count most, then the summary and tags, then the
body. Up to 50 results are returned, best first.

To help an article be found, give it a clear title, a summary that says what it answers, and tags
for the words readers use that the article does not.

Articles set to **Chat only** show up in the chat's search only.

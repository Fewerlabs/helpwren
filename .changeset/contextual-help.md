---
"@helpwren/core": minor
"helpwren": minor
"@helpwren/design-system": minor
"@helpwren/react-native": minor
---

Contextual help: the help articles that fit the page a visitor is on.

- `@helpwren/core`: `articleFilterSchema` and `articles.find(filter)`, evaluated in the database
  over published articles; `articles.forPage`; `helpRules` to list, add, change, reorder and
  remove the rules that map pages to filters, with `matchHelpRule` and `urlMatches`; articles
  carry `audiences`, `locale` and custom `fields`; the `contextualHelp.fallback` setting.
- `helpwren`: `setContext({ filter })` picks the articles the chat lists under "Help for this
  page"; `data-helpwren-help` blocks are filled with article links that open in the chat;
  `findArticles(filter)` and `openArticle(slug)`.
- `@helpwren/design-system`: `TagsInput` takes `suggestions`; a new `KeyValueInput` for names
  and values.
- `@helpwren/react-native`: `SupportScreen` takes a `filter`.

---
"@helpwren/core": minor
---

Add the knowledge base: `collections` and `articles` on the client (list, get by slug, search,
create, update, publish and unpublish, reorder, remove, reader feedback and picture uploads), the
`richTextSchema` an article's body is checked against, and `slugify`.
Articles carry tags, a visibility (`public` or `in_app`), a featured flag, a title and description
for search engines, and an author that can be changed. The `help_center` setting gains a header
style and picture, header and footer links, a search hint, whether to show the chat, a home page
title and description for search engines, and a public address; `settings.uploadHeaderImage`
stores the picture.

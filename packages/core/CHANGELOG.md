# @helpwren/core

## 0.1.0

### Minor Changes

- 6299394: Initial repository setup: pnpm and Turborepo monorepo, shared TypeScript, ESLint and Prettier
  configuration, the design-system package with Storybook and Vitest, and documented stubs for the
  product packages.
- ba5762a: Add the knowledge base: `collections` and `articles` on the client (list, get by slug, search,
  create, update, publish and unpublish, reorder, remove, reader feedback and picture uploads), the
  `richTextSchema` an article's body is checked against, and `slugify`.
  Articles carry tags, a visibility (`public` or `in_app`), a featured flag, a title and description
  for search engines, and an author that can be changed. The `help_center` setting gains a header
  style and picture, header and footer links, a search hint, whether to show the chat, a home page
  title and description for search engines, and a public address; `settings.uploadHeaderImage`
  stores the picture.
  `brand.poweredBy: false` hides the small "Powered by Helpwren" in the chat and the help center.
  An article carries its `author`, a name and a photo that readers with no session can see.
- c270d80: Add seventeen wren scenes (no results, nothing here, error, not found, ticket, resolved, team,
  settings, branding, notifications, attachments, visitors, offline, welcome, sign in, first article
  and open source), so each empty or notable moment has its own drawing. `bird={false}` now works on
  every scene, and `EmptyState` takes it too. Add a `wren` launcher for the widget, a speech bubble
  with the wren in it, and the same drawing as the `chat-wren` icon.

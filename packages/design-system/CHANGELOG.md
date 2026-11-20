# @helpwren/design-system

## 0.1.0

### Minor Changes

- e28e80a: Add `AppLoader`, a loading state drawn by hand: the wren draws itself for as long as the wait
  lasts. It is now the default first-load state of `QueryList` and `QueryDetail`, in place of
  skeleton rows, and `QueryList` no longer takes `loadingRows`. Pass `renderLoading` for anything
  else.
- c88e45e: Add the base components: Button, Link, Field, Input, Textarea, Label, Select, Checkbox,
  RadioGroup, Switch, StatusChip, Badge, Avatar, Kbd, Card, Separator, Tabs, Dialog, Sheet, Popover,
  Tooltip, Spinner and Skeleton.
- aca4fe2: `CodeSnippet` is now a proper code block: a quiet edge and tinted header, light syntax colouring
  for HTML, JavaScript, TypeScript and shell, `tabs` for several versions of one snippet,
  `lineNumbers`, a `copiedMessage` toast, and `variant="inline"` for a single value with an Open
  link. The existing `code`, `language`, `wrap` and `onCopied` props work as before.
- 4cbedb0: Add `ConfirmDialog`, with `useConfirm` and `ConfirmProvider` for asking from code, and `toast`
  with its `Toaster`, built on Sonner and drawn in Helpwren's own look. Add the `x-circle` icon.
- 3fae27c: Add `FieldList`, which builds a form's fields from a list of descriptions and wires them to React
  Hook Form.
- bf559d6: Text controls now show only an accent-coloured edge when focused with the mouse, and the focus ring
  when focused from the keyboard. Add a `flying` wren scene. Filled buttons now fill to their outer
  edge, so they match outlined buttons in size.
- 3ec8fcf: Add design tokens for light and dark themes, the `Icon` component with its Phosphor registry, and
  the internal shadcn/ui layer.
- 6299394: Initial repository setup: pnpm and Turborepo monorepo, shared TypeScript, ESLint and Prettier
  configuration, the design-system package with Storybook and Vitest, and documented stubs for the
  product packages.
- 2912176: Add `Combobox` (server-side search, infinite scrolling, multiple values, prefilled value
  resolution), `TagsInput`, `Expandable`, `FieldHint` and `FieldError`. `Input` gains `prepend`,
  `append`, `currency` and `formatter`. Buttons and inputs are now 40px tall by default.
- b8d2516: `QueryList` in infinite mode now shows a spinner under the last item while the next page loads and
  marks the end of the list with the wren. A field's error now takes the place of its hint.
- c270d80: Add seventeen wren scenes (no results, nothing here, error, not found, ticket, resolved, team,
  settings, branding, notifications, attachments, visitors, offline, welcome, sign in, first article
  and open source), so each empty or notable moment has its own drawing. `bird={false}` now works on
  every scene, and `EmptyState` takes it too. Add a `wren` launcher for the widget, a speech bubble
  with the wren in it, and the same drawing as the `chat-wren` icon.
- 94ab451: Add `PhoneInput`, with a country selector and country detection from typed or pasted numbers, and
  a `phone` type in `FieldList`. The tab indicator now slides between tabs, and a scrollable tab row
  brings the chosen tab to the centre.
- 0207bea: Add `QueryList` and `QueryDetail`, which fetch through TanStack Query and draw loading, empty,
  error, paging and infinite-scroll states, and `LinearProgress`. `Combobox` now keeps its options
  on screen under a progress bar while it loads. The focus ring follows the accent colour and turns
  red pen on invalid controls.
- 420e35b: Add `RichTextEditor`, a Notion-like editor for long writing (a slash menu of blocks, a bar over
  selected text, Markdown shortcuts, pictures and callouts), and `RichText`, which draws its
  documents on the server and cannot be made to run a script. Add `richTextHeadings`, `safeHref`
  and the icons the editor and the help center use.
  Beside the block under the pointer the editor shows a plus, which adds a block below, and a grip,
  which drags the block or opens a menu to turn it into another kind, duplicate it or delete it.
  `ArticleCard` takes an `icon`, for a card that stands for a collection.
  `RichText` draws code blocks as `CodeSnippet`, with a copy button.
- f9b1036: Add the shared components (EmptyState, SearchField, PageHeader, CodeSnippet, MessageBubble,
  ConversationListItem, ArticleCard, MarginNote, Highlight) and the illustrations: the six wren
  scenes and the logo. `QueryList` and `QueryDetail` now use `EmptyState` when there is nothing to
  show.
- 79f9f26: Add `DataTable` and the `Table` parts. `QueryList` and `QueryDetail` gain `contentClassName`, and
  their progress bar is now pinned to the top edge above any padding.

### Patch Changes

- 96fc726: The design system is now exercised by the app: a `/design` route and an example feature built only
  from its public entry point.
- f81e1f7: `Avatar` sits on a card's surface with a hairline edge, like the cards and panels around it.
- d175046: `Combobox` shows a spinner in the box while options load, in place of its leading icon or caret,
  instead of a progress bar over the list.

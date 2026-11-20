# @helpwren/design-system

## 0.1.0

### Minor Changes

- Contextual help: the help articles that fit the page a visitor is on.

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
- Add `IconGlyph`, `Icon` given the icon itself instead of its name, for components sent to the
  browser that need only a few icons. `ThemeMenu` and `CodeSnippet` use it, so a page that shows
  them downloads their few icons, not the whole set.
- Scenes gained small actions of their own, played once after they are drawn: the bell rings, the
  telescope sweeps, the bookmark drops into the book, and `hw-pop` pops a badge in a sketch. The plug in the "plugs-in"
  scene is its own group (`hw-plug`), so a page can move it into the socket.
- Illustrations can draw themselves as they scroll into view: `animate="in-view"` on `Wren`, and on
  the new `Sketch` (a page's own line drawing in the wren's hand) and `WrenBird` (the wren alone, in
  six poses: perched, wings up, wings down, gliding, landing and asleep). A drawing already on screen
  when the page opens is not redrawn, only lives; small movements pause while it is off screen; a
  wren can hop once with `react`. Reduced motion shows every drawing finished and still.
- Move the theme control into the design system, so the app and the website share it: `ThemeMenu`,
  `ThemeSwitch`, `themeChoices`, the `useTheme` and `useThemePreference` hooks, `setThemePreference`,
  and `themeScript`, which sets the theme before the page paints and can be limited to some paths.
- Add `WrenFlyer` and `wrenFrame`: the logo's wren drawn frame by frame for hand-drawn animation, at
  four view angles (side, three-quarter front, front, three-quarter back), each with an eight-frame
  wing beat, a glide and a landing flare, plus perched idles (look, blink, head tilt, hop, preen,
  asleep) and a carrying pose.
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

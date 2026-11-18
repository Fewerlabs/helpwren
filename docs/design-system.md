# Design system

`@helpwren/design-system` holds the tokens, components and illustrations. Feature code imports
from this package only.

## Look

Calm interface, hand-drawn character. Warm paper, ink lines, generous space. Outlines instead of
shadows. Personality comes from the wren illustrations, never from decoration in the product UI.

## Tokens

Colour lives in one file, `src/tokens/tokens.css`, as CSS variables for light (`:root`) and dark
(`.dark`). `src/tokens/theme.css` turns them into Tailwind utilities. The reasoning is in
[ADR 0003](decisions/0003-design-tokens.md).

### Using the stylesheet

```css
@import "tailwindcss";
@import "@helpwren/design-system/styles.css";
```

Dark mode applies under any element with the `dark` class.

### Colour

| Utility name                   | Light     | Dark      | Use                                                      |
| ------------------------------ | --------- | --------- | -------------------------------------------------------- |
| `background` / `paper`         | `#F7F4ED` | `#1C1A16` | Page background                                          |
| `card`, `popover`              | `#FDFBF7` | `#24211C` | Cards, panels, inputs                                    |
| `foreground` / `ink`           | `#26231E` | `#EDE8DC` | Text, icons, outlines                                    |
| `muted-foreground` / `pencil`  | `#6E675B` | `#A39B8B` | Secondary text                                           |
| `border`, `input` / `edge`     | `#8F8778` | `#827B6E` | Borders of controls and cards                            |
| `rule`                         | `#E3DDD0` | `#3A362F` | Dividers only, never control borders                     |
| `muted`, `secondary`, `accent` | `#EDE9E0` | `#2E2A24` | Hover and secondary fills                                |
| `primary` / `moss`             | `#3D6B57` | `#7FB59A` | Primary buttons, brand accent                            |
| `destructive` / `pen`          | `#B23520` | `#F07A5A` | Destructive actions, errors, urgent                      |
| `highlighter`                  | `#F5D547` | `#E8C64A` | Behind single words, with `highlighter-foreground`       |
| `biro`                         | `#2F5B85` | `#8DB3DB` | Links, open status, internal notes                       |
| `ring`                         | accent    | accent    | Focus ring: the accent, or red pen on an invalid control |
| `ochre`                        | `#7D5A12` | `#D9A441` | Waiting                                                  |

Use the semantic name (`bg-background`, `text-muted-foreground`, `border-border`) in components.
Use a brand name (`text-pen`, `bg-highlighter`) only when you mean that pen on the desk.

**Status** colours come in pairs: `text-status-open` on `bg-status-open-surface`, and the same for
`waiting`, `resolved`, `urgent` and `closed`. Always show a dot and a word with them; status never
depends on colour alone.

Outlined controls sit on `background` or `card`, not on `muted`, where the edge falls just below
3:1.

### Type

| Utility     | Font           | Use                                                       |
| ----------- | -------------- | --------------------------------------------------------- |
| `font-sans` | Figtree        | All interface text, at 400, 500 and 600                   |
| `font-mono` | JetBrains Mono | Code, IDs, labels and shortcuts                           |
| `font-hand` | Caveat         | Margin notes beside illustrations. Never in the interface |

Sizes are Tailwind's scale (`text-xs` 12px to `text-3xl` 30px) plus `text-2xs` (11px) for mono
eyebrow labels. The app loads the fonts with `next/font` (`apps/web/src/app/fonts.ts`), which sets
the `--font-figtree`, `--font-jetbrains-mono` and `--font-caveat` variables the tokens read.

### Shape, line and motion

- `border-line` is the 1.5px edge for controls and cards.
- `rounded-lg` is the control radius (10px); `rounded-xl` and `rounded-2xl` (14px and 16px) are
  for cards.
- `min-h-target` and `size-target` give the 44px minimum touch target.
- There are no box shadows: Tailwind's shadow utilities are neutralised in the theme. Focus is
  shown with a 2px outline in the accent colour, or red pen on an invalid control.
- Animations and transitions are cut to nothing under `prefers-reduced-motion: reduce`.

### In TypeScript

```ts
import { tokens } from "@helpwren/design-system";

<path stroke={tokens.color.moss} />;
```

Values are `var(--name)` references, so they follow the active theme.

### Adding or changing a colour

1. Edit `tokens.css`, in both `:root` and `.dark`.
2. Add the token to `theme.css` and to `tokens.ts` if components need it.
3. List the surfaces it may sit on in `contrast-pairs.ts`. The test fails until you do.
4. Run `pnpm --filter @helpwren/design-system test`.

## Theming for adopters

Set any of these CSS variables on an element that contains Helpwren UI. Unset variables fall back
to the Helpwren defaults.

| Variable                       | Default                         | Controls                               |
| ------------------------------ | ------------------------------- | -------------------------------------- |
| `--helpwren-accent`            | Moss                            | Primary buttons and other accent fills |
| `--helpwren-accent-foreground` | White (dark paper in dark mode) | Text and icons on the accent           |
| `--helpwren-font`              | Figtree                         | The interface font family              |
| `--helpwren-radius`            | `0.625rem` (10px)               | Control radius; cards scale from it    |

```css
.helpwren {
  --helpwren-accent: #6d28d9;
  --helpwren-accent-foreground: #ffffff;
  --helpwren-font: "Inter";
  --helpwren-radius: 0.375rem;
}
```

Check that your accent and its foreground reach 4.5:1 against each other, and that the accent
reaches 3:1 against the page background. Helpwren tests its own defaults, not yours.

## Layers

| Layer    | What it holds                                     | Who may import it                      |
| -------- | ------------------------------------------------- | -------------------------------------- |
| `ui`     | shadcn/ui output, kept close to upstream          | `base` only                            |
| `base`   | Our primitives, with our API, variants and styles | `shared`, and everything outside       |
| `shared` | Composed, reusable pieces with no business logic  | `data`, `form`, and everything outside |
| `data`   | Components that fetch through TanStack Query      | Everything outside                     |
| `form`   | Components that build forms on React Hook Form    | Everything outside                     |

ESLint enforces the boundaries. The reasoning is in
[ADR 0002](decisions/0002-component-layers.md).

## Icon

`Icon` is the only way to render an icon. Nothing else imports the icon library.

```tsx
<Icon name="heart" className="size-4" />
<Icon name="check-circle" weight="fill" className="size-5 text-moss" />
<Icon name="trash" label="Delete conversation" />
```

- **Size and colour:** an icon is `1em` and `currentColor`, so it follows the text around it. Add
  a class such as `size-4` or `text-pencil` to override.
- **Weight:** `regular` by default, which matches the 1.5px line at 24px. Also `thin`, `light`,
  `bold`, `fill` and `duotone`.
- **Accessibility:** decorative by default (`aria-hidden`, not focusable). Pass `label` when the
  icon carries meaning on its own; it is then announced as an image. For an icon-only button, put
  the label on the button, not on the icon.
- **`mirrored`** flips the icon for right-to-left layouts.

Use `Icon` for interface icons. Use an illustration, not an icon, for empty states and anything
with personality.

### Adding an icon

1. Find the icon on [phosphoricons.com](https://phosphoricons.com) and note its kebab-case name.
2. In `src/components/base/icon/registry.ts`, add one import (`HeartIcon`) and one registry entry
   (`heart: HeartIcon`), both in alphabetical order.

That is all. `IconName` is derived from the registry, so the new name autocompletes and a typo is
a type error. A test renders every registered icon, and the **Base / Icon / All Icons** story
lists them with a search box. Only registered icons end up in the bundle.

## Base components

Import them from the package entry point:

```tsx
import { Button, Field, Input } from "@helpwren/design-system";
```

Every control shares the same rules: a 1.5px edge on a card surface, a 10px radius, a solid 2px
outline in the accent colour when focused with the keyboard, and a red-pen edge when
`aria-invalid` (the focus outline turns red pen too, so the ring always matches the state). Buttons and
inputs are 40px tall so they line up in a row; buttons, checkboxes, radios and switches extend
their hit area invisibly to 44px. Each has a story under
**Base** in Storybook and a test beside it.

### Actions and navigation

**Button** starts an action. Variants: `primary` (the one filled element; one per view),
`secondary` (outlined, the default choice for everything else), `ghost` (low emphasis, toolbars),
`destructive` (outlined in red pen; confirm with a `Dialog`) and `link`. Sizes: `md` (40px, the
same height as an input), `sm` (32px), `icon` and `icon-sm`. An icon size requires `aria-label`; TypeScript enforces it.
`loading` shows a spinner and blocks clicks. `asChild` styles a child element, such as a router
link, as a button. Use `Link` instead when the result is navigation and it should look like text.

**Link** is for navigation inside text. It is biro blue and always underlined. `external` opens a
new tab, adds an icon and tells screen readers. `asChild` styles a router link. Use `Button` for
actions.

### Forms

**Field** wraps one control with its label, hint and error, and connects them: the label points at
the control, the hint and error describe it, and an error marks it invalid and is announced. Use
it for every `Input`, `Textarea`, `TagsInput`, `Combobox` and `Select`. For a `Select`, put the
`Field` inside it, around `SelectTrigger`. `required` marks the control and shows an asterisk.

**FieldHint** and **FieldError** are the small help and error lines that `Field` renders. Use them
directly when you lay out a control yourself, for example beside a `Checkbox`, and point the
control's `aria-describedby` at their id. `FieldError` is announced when it appears and renders
nothing when empty.

**Input** is a single-line text input.

- `prepend` and `append` put anything inside the box, before and after the text: an icon, a unit,
  a `Kbd`, a button. Clicking a plain addon focuses the input.
- `currency` groups digits as they are typed, so 1000 shows as 1,000. Pass options for the locale
  (`{ locale: "de-DE" }` shows 1.234,56), the number of decimals, or negatives. The currency
  symbol is yours to add with `prepend` or `append`.
- `formatter` handles any other shape of value. It is a pair of functions, `format` (raw value to
  display text) and `parse` (typed text to raw value); the caret stays in place while the text is
  reformatted. `createNumberFormatter` is the one behind `currency`.
- `onValueChange` always receives the raw value (`"1000.5"`, never `"1,000.5"`), and with a `name`
  the raw value is what a form submits. `value` accepts a string or a number.
- `className` styles the outer box and `inputClassName` the inner `<input>`.

Use `Textarea` for more than one line, `TagsInput` for several values, and `Combobox`, `Select` or
`RadioGroup` when the answers are known in advance.

**TagsInput** holds several free-text values in a box that grows. Enter or comma adds a value,
Backspace in an empty box removes the last one, and pasting a list adds every item. Customise it
with `transform` (clean each value), `validate` (reject a value), `separators`, `max`,
`allowDuplicates`, `renderTag` (replace the chip) and `prepend` or `append`. Use `Combobox` with
`multiple` when the values must come from a list.

**Combobox** is the select for anything beyond a short fixed list. It is a searchable box that:

- filters a fixed list (`options`), or loads from a server (`loadOptions`), which receives the
  search text, a cursor and an `AbortSignal`, and returns a page of options
- scrolls infinitely: return `nextCursor` from `loadOptions` and the next page loads when the end
  of the list is reached. The cursor can be a page number, an offset or an opaque token
- debounces typing (`debounceMs`) and aborts the previous request, so a slow early response never
  overwrites a later one
- takes one value or, with `multiple`, several, shown as removable chips in a box that grows
- shows loading, empty and error states, with a retry

Its value is the option's id, which is what a form stores. When a form is prefilled with an id
whose option is not in the loaded page, the box needs the label from somewhere:

- `resolveOptions(values, signal)` is called once with every selected value it does not know, in
  one batch. Point it at an endpoint such as `GET /contacts?ids=3,77,120`. While it runs the box
  shows "Loading…"; if it fails the raw value is shown and stays selected.
- `selectedOptions` skips the request when you already hold the option objects, for example
  because the record you are editing embeds them.

Options chosen during a search are remembered, so their labels survive the next search.

Everything visible can be replaced: `getOptionValue` and `getOptionLabel` (any option shape),
`renderOption`, `renderValue`, `filter`, `isOptionDisabled`, `prepend`, `footer` (for example a
"Create new" button), `messages` (every piece of text), and `clearable`, `searchable`, `name`,
`className` and `listClassName`. Keyboard: arrows move, Enter chooses, Escape closes, Backspace
removes the last value in `multiple`.

Use `Select` for a short fixed list that needs no search, and `RadioGroup` for four or fewer.

**Textarea** is a multi-line input that grows with its content. Use it for replies and notes.

**Label** names a control. Prefer `Field`, which includes one; use `Label` directly beside a
`Checkbox`, `Radio` or `Switch`.

**Select** (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`,
`SelectGroup`, `SelectLabel`, `SelectSeparator`) chooses one option from a short fixed list. With
four or fewer, use `RadioGroup` so every option is visible. For search, server data, infinite
scrolling or several values, use `Combobox`.

**Checkbox** is an independent yes or no that takes effect when a form is saved. Use `Switch` when
the change applies immediately, and `RadioGroup` when only one of several may be chosen.

**RadioGroup** and **Radio** choose exactly one of a few visible options. Give the group an
`aria-label` or a visible legend. Use `Select` for longer lists.

**Switch** turns a setting on or off with immediate effect. Use `Checkbox` inside a form that is
saved later.

### Status and labels

**StatusChip** shows a conversation or ticket status: `open`, `waiting`, `resolved`, `urgent` or
`closed`. It always pairs the colour with a dot and a word. Pass children to change the wording
("Waiting on you", "Verified", "Offline"). Use it only for status; use `Badge` for everything else.

**Badge** is a small label for a tag, a category or a count. Variants: `neutral`, `outline` and
`accent`. It carries no status meaning.

**Avatar** shows a person or organisation as their picture, or their initials while it loads or if
there is none. `name` is required and is its accessible name. Sizes: `sm`, `md`, `lg`.

**Kbd** shows a keyboard key or shortcut in the monospace font.

### Layout

**Card** (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`,
`CardFooter`) is an outlined surface for a group of related content. It has no shadow. Do not nest
cards; use a `Separator` inside one.

**Separator** is a thin divider in the rule colour, horizontal or vertical. It is decorative by
default. Prefer spacing; use a separator when spacing alone is not enough.

**Expandable** shows and hides content with a smooth size animation done in CSS grid alone (the
track moves between `0fr` and `1fr`), so nothing is measured in JavaScript and it works with
content of any height. Props: `open`, `orientation` (`vertical` or `horizontal`), `duration` in
milliseconds, `easing`, `fade`, and `contentClassName`. While closed its content is `inert`. It
only animates: put `aria-expanded` and `aria-controls` on your own trigger. Use `Dialog` or
`Sheet` when the content should sit above the page instead of pushing it.

**DataTable** is a table built from a list of columns. Each column has an `id`, a `header` and a
`cell(row)` that renders anything, plus optional `align`, `width`, `footer`, `hidden`, `rowHeader`
and class names.

- **Sorting:** mark a column `sortable` and give it a `sortValue(row)`; pressing the header cycles
  ascending, descending, unsorted. Empty values always sort last. With `manualSorting` the table
  only reports the choice through `onSortChange`, for sorting on the server. Control it with
  `sort`.
- **Selection:** `selectable` adds a checkbox column with select-all. Control it with
  `selectedKeys` and `onSelectedKeysChange`; `isRowSelectable` disables rows.
- **States:** `loading` shows placeholder rows when there are none, or a progress bar under the
  header when rows are already showing. `empty` replaces the rows when there are none.
- **Look:** `density`, `striped`, `stickyHeader` (give the table a height with
  `containerClassName`), `rowProps` for per-row attributes, and `messages` for every label.

It always needs a `caption`, which names the table for screen readers (`showCaption` makes it
visible). For paging or infinite scrolling, wrap it in `QueryList` and pass `children` as a
function. To make a row lead somewhere, put a `Link` or `Button` in a cell rather than making the
whole row clickable, so it works from the keyboard.

**Table** and its parts (`TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`,
`TableCell`, `TableCaption`) are for a table laid out by hand. Use `DataTable` for anything driven
by data.

**Tabs** (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) switch between views of the same
context. Give `TabsList` an `aria-label`. Use links, not tabs, to move between pages.

### Overlays

**Dialog** (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`,
`DialogDescription`, `DialogFooter`, `DialogClose`) interrupts the page for a decision or a short
task. It needs a `DialogTitle`. Put the primary action last in `DialogFooter`. Use a `Sheet` for
longer, secondary content, and a `Popover` for something small that should not block the page.

**Sheet** (`Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`,
`SheetDescription`, `SheetFooter`, `SheetClose`) slides a panel in from an edge (`side`), for
detail beside the page such as contact information. It needs a `SheetTitle`.

**Popover** (`Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`) is a small panel
anchored to its trigger, for content the person interacts with. Give `PopoverContent` an
`aria-label`. Use `Tooltip` for plain text hints.

**Tooltip** shows a short hint when its child is hovered or focused: `<Tooltip content="Copy">`.
The child must be focusable. Never put essential information only in a tooltip, and never put
interactive content in one. Place one `TooltipProvider` near the root of the app.

### Loading

**LinearProgress** is a thin bar along the top edge of content. Use it when content is already on
screen and is being refreshed or added to, so nothing jumps: `Combobox`, `DataTable`, `QueryList`
and `QueryDetail` all do. Leave `value` out when the amount of work is unknown, or pass 0 to 100.
Use `Spinner` or `Skeleton` when there is nothing to show yet.

**Spinner** shows that something short is in progress. It is announced as "Loading"; change that
with `label`. `Button` has one built in through `loading`.

**Skeleton** stands in for content that is loading, in its shape. It is hidden from assistive
technology, so announce loading once on the container (`role="status"`).

## Shared components

Composed pieces built only from base components and the illustrations. They hold no business
logic, fetch nothing and keep no store, so they work anywhere: the inbox, the widget, the help
center. Each is shown under **Shared** in Storybook.

**EmptyState** fills a place that would otherwise be blank: an empty list, no search results, a
first run. It shows a wren scene, a `title`, an optional `description` and an `action`. Pick the
`scene` to suit (`all-caught-up` by default), pass `scene={false}` for none, or supply your own
`illustration`. `size="sm"` fits a panel or a popover; `headingLevel` fits the title into the page
outline. It is the default empty state of `QueryList` and `QueryDetail`. For an error, write what
went wrong and offer a retry instead; the wren is for calm moments.

**SearchField** is an `Input` set up for search: a magnifying glass, a clear button once there is
text (Escape clears too), an optional `shortcut` hint while empty, and a `loading` spinner. Enter
calls `onSearch`. Give it an `aria-label` or wrap it in a `Field`. For choosing from results in a
dropdown, use `Combobox`.

**PageHeader** is the top of a page or a major section: an optional mono `eyebrow`, the `title`,
a `description`, and `actions` on the right. `headingLevel` defaults to 1; use 2 for a section. It
is not a landmark, so a page may have several.

**CodeSnippet** shows a block of code with a copy button, for install snippets and API examples.
`language` labels it, `wrap` wraps long lines instead of scrolling, and `onCopied` tells you when
it was copied. Use `Kbd` for a single key and plain `<code>` for a word inside a sentence.

**MessageBubble** is one message in a conversation. `from="self"` is filled and sits on the right;
`from="other"` is outlined and sits on the left, so the two are told apart by shape and position,
not colour, and screen readers hear who is speaking. `author` and `time` label it, `footer` holds
a delivery status or attachments, and `note` marks an internal note the contact cannot see. Lay
bubbles out in a flex column.

**ConversationListItem** is one row in a conversation list: avatar, name, the latest message,
`time`, a `status` chip and an `unread` count. It is a link when given `href` and a button
otherwise, and `selected` marks the conversation that is open. Use `DataTable` when the list needs
columns and sorting.

**ArticleCard** is a help article in a list or grid: `category`, `title`, `summary` and `meta`.
The whole card is one link. Use a plain `Link` for an article mentioned in running text.

**Highlight** marks a word or short phrase with the yellow highlighter, or with a wavy red-pen
underline (`variant="pen"`). It sits behind a word, never a paragraph.

**MarginNote** is a handwritten note in red pen with one arrow (`down-right`, `up-left` or
`none`).

`Highlight` and `MarginNote` are for the marketing site, the docs and beside illustrations. They
do not belong in the product interface, which stays calm.

## Illustrations

**Wren** draws the wren in one of six scenes, converted from the brand boards:

| `scene`              | Shows                                       | Use for                                     |
| -------------------- | ------------------------------------------- | ------------------------------------------- |
| `all-caught-up`      | On a branch, with a ticked box              | Empty inbox, nothing waiting                |
| `conversations`      | Standing on a speech bubble                 | First message, the chat section of the site |
| `help-articles`      | On a stack of books                         | Knowledge base, no search results           |
| `help-for-this-page` | On a browser window, pointing at part of it | Contextual help                             |
| `self-hosted`        | On the roof of a birdhouse                  | Setup screens, the hosting section          |
| `plugs-in`           | On a cable about to be plugged in           | Install steps, the developer section        |

- **Colour:** ink lines take the text colour (`currentColor`), so they turn to paper in dark mode.
  Moss, red pen and highlighter come from the tokens.
- **Motion:** with `animate` (the default) a scene draws itself in once, then stays mostly still.
  `animate={false}` shows it finished. People who prefer reduced motion always see it still.
- **Accessibility:** each scene has a built-in description; override it with `label`, or pass
  `decorative` when the text beside it already says everything (as `EmptyState` does).

Size it with a width class; it keeps its proportions.

**Logo** is the Helpwren mark, a wren drawn in one line. `variant="lockup"` adds the wordmark.
`size` is the height of the mark in pixels: as it shrinks, detail drops in the order the brand
board sets (brow, then wing, then eye) and the line thickens so it stays legible at 16px. It takes
the text colour.

Use an illustration for moments with personality, and an `Icon` for interface controls.

## Data components

`QueryList` and `QueryDetail` fetch through [TanStack Query](https://tanstack.com/query) and draw
every state around the request, so a feature only writes the request and the row. They need a
`QueryClientProvider` above them, which the app provides. The reasoning is in
[ADR 0004](decisions/0004-data-layer.md).

Both pass these TanStack Query options straight through: `enabled`, `staleTime`, `gcTime`,
`refetchInterval`, `refetchOnWindowFocus` and `retry`. Results are cached by `queryKey`, so include
every filter the request depends on in the key.

In both, the progress bar is pinned to the very top edge and stays there while the content
scrolls. Put the box (border, background, radius, height, scrolling) on `className` and the
padding on `contentClassName`; padding on `className` would push the bar down.

### QueryList

```tsx
<QueryList
  queryKey={["conversations", { status }]}
  queryFn={({ cursor, signal }) => api.conversations.list({ status, cursor, signal })}
  renderItem={(conversation) => <ConversationListItem conversation={conversation} />}
  getItemKey={(conversation) => conversation.id}
/>
```

`queryFn` receives `{ page, cursor, pageSize, signal }` and returns `{ items, nextCursor?, total? }`.
`pagination` chooses how more items arrive:

- **`infinite`** (default) appends the next page when the end of the list scrolls into view, as
  long as the last page returned `nextCursor`. `loadMoreOn="button"` shows a "Load more" button
  instead.
- **`pages`** shows one page at a time with previous and next. The current page stays on screen
  under the progress bar until the next arrives. Pass `pageSize` and return `total` to show
  "Page 2 of 13". Control it with `page` and `onPageChange`, for example to keep the page in the
  URL.
- **`none`** makes a single request with no paging.

States it draws for you, each replaceable:

| State                                 | Default                                    | Replace with       |
| ------------------------------------- | ------------------------------------------ | ------------------ |
| First load                            | Skeleton rows (`loadingRows`)              | `renderLoading`    |
| No items                              | `EmptyState` with `messages.empty`         | `renderEmpty`      |
| Failed with nothing to show           | A message and a "Try again" button         | `renderError`      |
| Failed with items showing (load more) | A compact message and retry under the list | `renderError`      |
| Refreshing with items showing         | `LinearProgress` pinned to the top         |                    |
| Paging controls                       | Previous, "Page x of y", Next              | `renderPagination` |

Also: `header` and `footer` around the items, `messages` for every piece of text, and
`listClassName` and `itemClassName`. For a table, a grid or anything that is not a list, pass
`children` as a function: it receives the whole state (`items`, `status`, `total`, `hasMore`,
`loadMore`, `retry`, `refetch`, `pagination`, and the fetching flags) and you draw everything.

### QueryDetail

```tsx
<QueryDetail queryKey={["contact", id]} queryFn={({ signal }) => api.contacts.get(id, { signal })}>
  {(contact, { refetch, isFetching }) => <ContactCard contact={contact} />}
</QueryDetail>
```

It draws the first load (`renderLoading`), not found when `queryFn` returns `null` or `isEmpty`
says so (`renderEmpty`), and failure with a retry (`renderError`). Once the item is showing, a
refresh keeps it on screen under the progress bar. Two components with the same `queryKey` share
one request and one cached result.

Use `QueryDetail` for one record and `QueryList` for many. Use neither for data you already hold:
pass it as props.

## Form components

### FieldList

`FieldList` builds the fields of a form from a list. You keep `useForm`, the Zod schema, the
`<form>` element and the submit button; it renders the controls and wires each one's value, change
handler and validation message to React Hook Form.

```tsx
const schema = z.object({
  email: z.email("Enter an email address."),
  plan: z.string().min(1, "Choose a plan."),
  budget: z.string(),
});
type Values = z.infer<typeof schema>;

const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues });

<form onSubmit={form.handleSubmit(save)}>
  <FieldList
    control={form.control}
    columns={2}
    fields={[
      { name: "email", label: "Email", type: "input", props: { type: "email" } },
      { name: "plan", label: "Plan", type: "select", props: { options: plans } },
      { name: "budget", label: "Budget", type: "input", props: { currency: true, prepend: "$" } },
    ]}
  />
  <Button type="submit">Save</Button>
</form>;
```

Each item has:

- **`name`:** the path of the value in the form. TypeScript checks it against the form's type, so
  a name that is not in the schema is an error. Nested paths such as `"address.city"` work.
- **`label`**, and optionally `hint`, `required` (shows the asterisk; the schema does the
  validating), `hidden` (leave the field out, for example depending on another value) and
  `className` (for example `sm:col-span-2`).
- **`type`**, which picks the control, and **`props`**, which are that control's own props and are
  typed to match:

| `type`     | Renders      | `props`                                                                       |
| ---------- | ------------ | ----------------------------------------------------------------------------- |
| `input`    | `Input`      | Any `Input` prop: `type`, `prepend`, `append`, `currency`, `formatter`        |
| `textarea` | `Textarea`   | Any `Textarea` prop                                                           |
| `select`   | `Select`     | `options` (required), `placeholder`                                           |
| `combobox` | `Combobox`   | Any `Combobox` prop: `options` or `loadOptions`, `resolveOptions`, `multiple` |
| `tags`     | `TagsInput`  | Any `TagsInput` prop                                                          |
| `radio`    | `RadioGroup` | `options` (required)                                                          |
| `checkbox` | `Checkbox`   | Any `Checkbox` prop                                                           |
| `switch`   | `Switch`     | Any `Switch` prop                                                             |
| `custom`   | Your own     | No `props`; a `render({ field, fieldState })` function returns the control    |

The form owns `value`, `onChange`, `name` and `id`, so those are not accepted in `props`. Value
shapes: text controls hold a string (a `currency` input holds the plain number as a string, such
as `"12500"`), `tags` and a `multiple` combobox hold a string array, and `checkbox` and `switch`
hold a boolean.

`columns` lays the fields out in one, two or three columns from the `sm` breakpoint up, and
`disabled` disables them all, for example while saving. For a layout `FieldList` cannot express,
use `Field` with the controls directly and React Hook Form's `Controller`.

## The `ui` layer

`src/components/ui` holds shadcn/ui components (style `radix-nova`, on Radix). They are restyled
through tokens only and kept in upstream formatting: the folder is excluded from Prettier, and
style-only lint rules are off there, so an update produces a clean diff.

Components present: avatar, badge, button, card, checkbox, dialog, field, input, kbd, label,
popover, radio-group, select, separator, sheet, skeleton, spinner, switch, tabs, textarea,
tooltip.

### Adding or updating a `ui` component

```bash
pnpm --filter @helpwren/design-system ui:add <component...>
pnpm --filter @helpwren/design-system ui:add <component...> --overwrite   # to update
```

The script runs the shadcn CLI and then reapplies two mechanical edits to every `ui` file:

- `import { cn } from "cn"` becomes `import { cn } from "#lib/cn"`. Upstream now ships `cn` as an
  npm package; ours is configured for the custom utilities in `theme.css`, and the script removes
  the upstream package again. Lint forbids importing `cn` from anywhere else.
- `.tsx` is dropped from `#components/...` imports, because the package's import map adds it.

### Icon edits to reapply after an update

`components.json` sets `iconLibrary` to `phosphor`, so the CLI never installs Lucide. It writes
direct Phosphor imports, which lint rejects; replace them with `Icon`. The script lists the files
that need it. Files changed so far:

| File           | Upstream                                                | Ours                                                  |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `checkbox.tsx` | `<CheckIcon />`                                         | `<Icon name="check" />`                               |
| `dialog.tsx`   | `<XIcon />`                                             | `<Icon name="x" />`                                   |
| `sheet.tsx`    | `<XIcon />`                                             | `<Icon name="x" />`                                   |
| `select.tsx`   | `<CaretDownIcon />`, `<CaretUpIcon />`, `<CheckIcon />` | `<Icon name="caret-down" />`, `"caret-up"`, `"check"` |
| `spinner.tsx`  | `<SpinnerIcon aria-label="Loading" {...props} />`       | `<Icon label="Loading" {...props} name="spinner" />`  |

In each file the import line becomes `import { Icon } from "#components/base/icon/icon"`.

### Imports inside the package

The package uses Node subpath imports (`package.json#imports`) instead of TypeScript path aliases,
so the same specifiers resolve in the app, in Storybook and in tests: `#components/...` and
`#lib/...`.

## Adding a component

1. Decide the layer. A primitive goes in `base`; something composed from primitives goes in
   `shared`.
2. If shadcn has the component, add it to `ui` with the shadcn CLI and wrap it in `base`.
   Otherwise build it in `base` directly on Radix.
3. Meet the definition of done:
   - typed props, sensible defaults, variants through `cva`, `className` merged with `cn()`, and
     the ref forwarded
   - correct roles and labels, keyboard support and a visible focus ring
   - a Storybook story covering variants and states, including dark mode
   - a Vitest and Testing Library test for behaviour; the story's accessibility check passes
   - a short entry on this page: when to use it, and when to use something else
4. Export it from `src/index.ts`.
5. Add a changeset.

## Storybook

```bash
pnpm storybook
```

Every story also runs as a test in headless Chromium, with an accessibility check that fails the
test on a violation (`a11y: { test: "error" }` in `.storybook/preview.ts`).

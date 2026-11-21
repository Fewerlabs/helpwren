# Design system

`@helpwren/design-system` holds the tokens, components and illustrations. Feature code imports
from this package only.

## Look

Calm interface, hand-drawn character. Plain greys, ink lines, generous space. Outlines instead of
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
| `background` / `paper`         | `#F7F7F7` | `#0C0C0D` | Page background                                          |
| `canvas`                       | `#F3F3F3` | `#0C0C0D` | The dashboard's ground, behind its white panels          |
| `card`, `popover`              | `#FFFFFF` | `#161616` | Cards, panels, inputs                                    |
| `foreground` / `ink`           | `#1A1A1A` | `#E5E5E5` | Text, icons, outlines                                    |
| `muted-foreground` / `pencil`  | `#666666` | `#969696` | Secondary text                                           |
| `border`, `input` / `edge`     | `#8A8A8A` | `#6E6E6E` | Borders of controls and cards                            |
| `rule`                         | `#E8E8E8` | `#262626` | Dividers only, never control borders                     |
| `muted`, `secondary`, `accent` | `#F1F1F1` | `#1E1E1E` | Hover and secondary fills                                |
| `well`                         | `#EBEBEB` | `#232323` | A field set into a white panel, such as the chat's box   |
| `primary` / `moss`             | `#3D6B57` | `#7FB59A` | Brand accent: links, icons, the focus ring               |
| `primary-fill`                 | `#3D6B57` | `#3D6B57` | Filled buttons, with white words in both themes          |
| `destructive` / `pen`          | `#B23520` | `#F07A5A` | Destructive actions, errors, urgent                      |
| `highlighter`                  | `#F5D547` | `#E8C64A` | Behind single words, with `highlighter-foreground`       |
| `biro`                         | `#2F5B85` | `#8DB3DB` | Links, open status, internal notes                       |
| `ring`                         | accent    | accent    | Focus ring: the accent, or red pen on an invalid control |
| `ochre`                        | `#7D5A12` | `#D9A441` | Waiting                                                  |

The greys carry no tint: white panels on a light-grey ground, near-black ink. The brand colour is
for accents only.

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

One icon is our own and not from the library: `chat-wren`, the wren inside a speech bubble, which
is also the widget's `wren` launcher. It is built in the registry on the library's base component,
so it takes the same props. It has a single line weight, and `weight="fill"` is the solid bubble
with the wren cut out, which is the form that reads best under about 24px.

`IconName` is derived from the registry, so the new name autocompletes and a typo is
a type error. A test renders every registered icon, and the **Base / Icon / All Icons** story
lists them with a search box. Only registered icons end up in the bundle.

## Base components

Import them from the package entry point:

```tsx
import { Button, Field, Input } from "@helpwren/design-system";
```

Every control shares the same rules: a 1.5px edge on a card surface and a 10px radius. Focus is
quiet for the mouse and clear for the keyboard:

- **Text controls** (`Input`, `Textarea`, `TagsInput`, `Combobox`, `PhoneInput`, the `Select`
  trigger): any focus turns the edge to the accent colour. The 2px focus ring appears only when
  focus arrives from the keyboard, such as with Tab.
- **Everything else** (buttons, checkboxes, switches, tabs, links): the ring appears for keyboard
  focus only, which is the browser's own behaviour.
- **Invalid controls** use red pen for both the edge and the ring.

Buttons and inputs are 40px tall so they line up in a row; buttons, checkboxes, radios and
switches extend their hit area invisibly to 44px. Each has a story under
**Base** in Storybook and a test beside it.

### Actions and navigation

**Button** starts an action. Variants: `primary` (the one filled element; one per view),
`secondary` (outlined, the default choice for everything else), `ghost` (low emphasis, toolbars),
`destructive` (outlined in red pen; confirm with a `ConfirmDialog`) and `link`. Sizes: `md` (40px, the
same height as an input), `sm` (32px), `icon` and `icon-sm`. An icon size requires `aria-label`; TypeScript enforces it.
`loading` shows a spinner and blocks clicks. `asChild` styles a child element, such as a router
link, as a button. Use `Link` instead when the result is navigation and it should look like text.

**ActionMenu** holds a row's actions behind a "⋯" button, as Featurebase and Intercom do, so a
list stays one line a row however many actions each has. Give it `target` (the button reads
"More actions for Ada") and `items`, each with a `label`, an optional `icon` and `onSelect`.
`destructive` items go last, in red, after a line; confirm them with a `ConfirmDialog`. For one or
two actions that are always wanted, plain buttons beside the row are clearer.

**Link** is for navigation inside text. It is biro blue and always underlined. `external` opens a
new tab, adds an icon and tells screen readers. `asChild` styles a router link. Use `Button` for
actions.

### Forms

**ColorPicker** chooses a colour from a set of swatches, some of them gradients, or any other
from a picker that the last circle opens: a square for saturation and brightness, a strip for
hue, and a hex box. The value is `{ color, to? }`, where `to` is the colour a gradient ends on,
and it is always a real colour, so there is nothing to validate. `colorBackground(value)` gives
the CSS that paints it. Use it for a brand or theme colour, not a bare text input.

**MessageBubble** takes `attachments`: the files sent with a message, drawn under its words. A
message that is only files has no bubble.

**OtpInput** takes a one-time code with a box for each digit. It is one real text field drawn as
boxes, so pasting a whole code and a phone's code suggestion work. Only digits are kept, and
`onComplete` fires when the last one is in.

**ChoiceCards** chooses one of two to four options that are easier to recognise by sight than by
name: each is a card with a small `visual` above its label. Underneath it is a radio group, so
the arrow keys work. A card can be `disabled` with a `description` saying why.

**Slider** picks a number from a range by dragging, with the value shown beside the track through
`formatValue`. Use it where the feel matters more than the figure, such as spacing.

**Field** wraps one control with its label, hint and error, and connects them: the label points at
the control, the hint describes it, and an error marks it invalid, is announced, and takes the
hint's place so only one line shows under the control. Use
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

**PhoneInput** is an input for phone numbers. In front of the number is a country selector
showing a flag and dialling code; pick another country there, or type or paste a number with its
country code (`+44…`, or `0044…`) and the country is recognised for you. The number is formatted
for its country as it is typed.

- The value, and what a form submits, is always the full international number, such as
  `+442079460958`. `onValueChange` also receives `{ country, nationalNumber, isValid }`.
- `defaultCountry` sets the starting country (default `NG`, +234), `countries` limits the list,
  `preferredCountries` puts some at the top, and `locale` sets the language of the country names.
- In the country list, typing a country's name jumps to it.

Validate the number in your schema as well; `isValid` is there for immediate feedback. Parsing and
formatting come from `libphonenumber-js`. Flags are emoji, which Windows shows as two letters.

**TagsInput** holds several free-text values in a box that grows. Enter or comma adds a value,
Backspace in an empty box removes the last one, and pasting a list adds every item. Customise it
with `transform` (clean each value), `validate` (reject a value), `separators`, `max`,
`allowDuplicates`, `renderTag` (replace the chip) and `prepend` or `append`. Use `Combobox` with
`multiple` when the values must come from a list.

**Combobox** is the select for anything beyond a short fixed list. It is a searchable box that:

- filters a fixed list (`options`), or loads from a server (`loadOptions`), which receives the
  search text, a cursor and an `AbortSignal`, and returns a page of options
- scrolls infinitely: return `nextCursor` from `loadOptions` and the next page loads when the end
  of the list is reached. "Loading more" shows at the bottom of the list while it arrives. The cursor can be a page number, an offset or an opaque token
- debounces typing (`debounceMs`) and aborts the previous request, so a slow early response never
  overwrites a later one
- takes one value or, with `multiple`, several, shown as removable chips in a box that grows
- shows a spinner in the box while options load, in place of the `prepend` icon (or of the caret
  when there is none), and empty and error states with a retry

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

**Avatar** sits on a card's surface with a hairline edge, like the cards around it. It shows a person or organisation as their picture, or their initials while it loads or if
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
visible). For a fetched table, use `QueryTable`, which draws its loading, error, empty and paging
states. To make a row lead somewhere, put a `RowLink` in the first column rather than making the
whole row clickable, so it works from the keyboard: it is a button, or the link you pass with
`asChild`, and its name is underlined on hover and focus with a pointer cursor, so every table's
names look pressable in the same way.

**Table** and its parts (`TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`,
`TableCell`, `TableCaption`) are for a table laid out by hand. Use `DataTable` for anything driven
by data.

**Tabs** (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) switch between views of the same
context. One indicator sits behind the active tab and slides to the next one when the
selection changes. When the tabs do not fit, the row scrolls sideways and the chosen tab is
brought to the centre. Give `TabsList` an `aria-label`. Use links, not tabs, to move between pages.

### Overlays

**Dialog** (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`,
`DialogDescription`, `DialogFooter`, `DialogClose`) interrupts the page for a decision or a short
task. It needs a `DialogTitle`. Put the primary action last in `DialogFooter`. Use a `Sheet` for
longer, secondary content, and a `Popover` for something small that should not block the page.

**ConfirmDialog** asks the person to confirm an action before it happens: something that cannot
be undone, or that other people will notice. It is an alert dialog, so a click outside does not
dismiss it; Cancel and Escape do.

- `title`, `description`, and `children` for anything more to ask, such as a checkbox;
  `confirmDisabled` holds the button until that is answered.
- `confirmLabel` and `cancelLabel`. Name the action ("Delete", "Resolve"), not "OK".
- `tone="destructive"` turns the confirm button red and puts the focus on Cancel, so Enter cannot
  destroy anything by accident. `icon` shows beside the title in the tone's colour.
- `onConfirm` may return a promise. The button shows `loading` until it settles; the dialog closes
  when it resolves, and stays open with an error line when it rejects. The line is the rejection's
  own message, or `errorMessage`.
- Open it with a `trigger` element, or control it with `open` and `onOpenChange`.

From code, `useConfirm` needs no markup. It resolves to `true` or `false`:

```tsx
const confirm = useConfirm();

if (await confirm({ title: "Resolve this conversation?", confirmLabel: "Resolve" })) {
  resolve();
}
```

It takes the same options as the component, and needs one `ConfirmProvider` above it; the
dashboard has one. Use a `Dialog` when the person has something to fill in, not only to agree to.

**Toast** tells the person something happened, without interrupting them: `toast.success("Changes
saved")`, `toast.error(...)`, `toast.message(...)` for a plain line, and `toast.promise(promise,
{ loading, success, error })` for one toast that follows a request. Each takes a `description`,
an `action` (`{ label, onClick }`, such as "Undo"), a `duration` and an `id`; a toast shown with
the id of one on screen replaces it. `toast.dismiss(id)` closes one early. Mount one `Toaster`
on the screen (the dashboard has one); it sits bottom right unless given a `position`. Keep a
toast to a few words and never put the only copy of something important in one, because it
leaves by itself: an error the person must act on in a form belongs beside the form too.

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
screen and is being refreshed, so nothing jumps: `DataTable`, `QueryList` and `QueryDetail` all
do. Leave `value` out when the amount of work is unknown, or pass 0 to 100.
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
outline. It is the default empty state of `QueryList` and `QueryDetail`. For a list or a panel
that failed to load, write what went wrong and offer a retry with no drawing (`scene={false}`);
the wren is for calm moments. A whole page that failed or does not exist is the exception, and
has the `error` and `not-found` scenes.

**AppLoader** is the loading state for a page, a panel or anything else with nothing to show
yet: the wren draws itself on its twig, gives a small hop, and is drawn again for as long as the
wait lasts. `label` says what is loading ("Opening the article") and is announced; `size` is
`sm`, `md` or `lg`; `bird={false}` draws a line of handwriting in place of the wren, for a
screen that carries someone else's brand; `fill={false}` stops it filling its container. It is
the default first-load state of `QueryList` and `QueryDetail`. People who prefer reduced motion
see the drawing finished and still. Use `Skeleton` only where the shape of what is coming is
known and helps, such as the rows of a table (`DataTable` does this itself), and `Spinner`
inside a button or beside a line of text.

**SearchField** is an `Input` set up for search: a magnifying glass, a clear button once there is
text (Escape clears too), an optional `shortcut` hint while empty, and a `loading` spinner. Enter
calls `onSearch`. Give it an `aria-label` or wrap it in a `Field`. For choosing from results in a
dropdown, use `Combobox`.

**PageHeader** is the top of a page or a major section: an optional mono `eyebrow`, the `title`,
a `description`, and `actions` on the right. `headingLevel` defaults to 1; use 2 for a section. It
is not a landmark, so a page may have several.

**CodeSnippet** shows code to read and copy, for install snippets and API examples. It has a
quiet edge and a tinted header with the copy button, which says "Copied" once pressed.

- `code` and `language`, or `tabs` (`{ label, language, code }[]`) for several versions of one
  snippet, such as the same step for HTML, React and Next.js. Copy takes the open tab.
- `language` labels the block and decides the colouring. `html`, `js`, `jsx`, `ts`, `tsx` and
  `shell` are coloured (tags, attributes, strings, comments, keywords) by a small tokenizer of
  our own in the theme's colours; any other language shows plain. It is a light pass for short
  snippets, not a parser.
- Long lines scroll sideways; `wrap` wraps them instead. `lineNumbers` numbers the lines.
- `onCopied` tells you when it was copied, and `copiedMessage` also says so in a `toast`.
- `variant="inline"` is one line for a single value such as a link or a key: the value, a copy
  button, and an "Open" link when given `openHref`. Give it an `aria-label` saying what the value
  is, and a `copyLabel` such as "Copy link".

Use `Kbd` for a single key and plain `<code>` for a word inside a sentence.

**MessageBubble** is one message in a conversation. `from="self"` is filled and sits on the right;
`from="other"` is outlined and sits on the left, so the two are told apart by shape and position,
not colour, and screen readers hear who is speaking. `author` and `time` label it, `footer` holds
a delivery status or attachments, and `note` marks an internal note the contact cannot see. Lay
bubbles out in a flex column.

**TypingIndicator** says someone on the other side is writing: three dots in a bubble where
their message will appear, an optional `avatar`, and the words ("Ada is typing…", "Ada and Sam
are typing…"). It is a polite live region that stays mounted and draws nothing while `names` is
empty, so screen readers hear each change once. The dots hold still under reduced motion. Put it
after the last message, inside the scrolling thread.

**ConversationListItem** is one row in a conversation list: avatar, name, the latest message,
`time`, a `status` chip and an `unread` count. It is a link when given `href` and a button
otherwise, and `selected` marks the conversation that is open. Use `DataTable` when the list needs
columns and sorting.

**ArticleCard** is a help article in a list or grid: `category`, `title`, `summary` and `meta`.
With `icon` it stands for a whole collection of articles, with the icon in a tile above the name.
The whole card is one link. Use a plain `Link` for an article mentioned in running text.

**RichText** draws a rich-text document as a page: headings, paragraphs, lists, quotes, code,
pictures and callouts (`Note`, `Tip`, `Warning`). Code blocks are drawn as `CodeSnippet`, with
their language named and a button to copy them. Give it the `doc` that `RichTextEditor`
produced. It runs on the server and loads none of the editor's code. It is safe to show
whatever was written: it draws only the kinds of node and mark it knows, and follows only web,
email and phone addresses and paths on the same site, so a document cannot become markup or a
script. `richTextHeadings(doc)` lists the headings with the same `id`s the page gives them, for
a table of contents. The typography is the `.hw-rich-text` class in the stylesheet, shared with
the editor so writing looks like the published page.

**RichTextEditor** is where long writing is done, such as a help article. It works the way
Notion does: the page is only the writing, with no toolbar above it.

- Typing `/` opens a menu of blocks, narrowed by what is typed next: text, heading, subheading,
  bulleted and numbered lists, quote, code block, the three callouts, divider and picture. The
  arrow keys move through it and Enter chooses. The "Add block" button under the writing opens
  the same menu, for touch screens and for anyone who has not found the slash.
- Selecting words brings up a small bar: heading, subheading, bold, italic, strikethrough,
  inline code and link. A link's address is typed into the bar itself.
- Markdown shortcuts work as typed: `## ` and `### ` for headings, `- ` and `1. ` for lists,
  `> ` for a quote, three backticks for code, `---` for a divider, `**bold**` and `` `code` ``.
- `uploadImage(file)` stores a picture and returns its address (or `null` if it failed, after
  you have said why with a `toast`). With it, pictures can be chosen, pasted or dropped in, and
  a selected picture can be given a description. Without it the editor offers no pictures.
- It is uncontrolled: `defaultValue` is the document to start from and `onChange` reports the
  whole document after every change. Give it a new `key` to start again from another document.
  `disabled` shows the writing and allows no changes.

It is built on [Tiptap](https://tiptap.dev) (see
[ADR 0016](decisions/0016-knowledge-base.md)); nothing outside this component imports it. Use a
`Textarea` for a few plain lines, such as a message or a description.

**Highlight** marks a word or short phrase with the yellow highlighter, or with a wavy red-pen
underline (`variant="pen"`). It sits behind a word, never a paragraph.

**MarginNote** is a handwritten note in red pen with one arrow (`down-right`, `up-left` or
`none`).

`Highlight` and `MarginNote` are for the marketing site, the docs and beside illustrations. They
do not belong in the product interface, which stays calm.

## Illustrations

**Wren** draws the wren in one of its scenes. The first six are converted from the brand boards;
the rest were drawn for the product in the same line and are not on the boards.

| `scene`              | Shows                                          | Use for                                              |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `all-caught-up`      | On a branch, with a ticked box                 | Empty inbox, nothing waiting                         |
| `conversations`      | Standing on a speech bubble                    | First message, the chat section of the site          |
| `help-articles`      | On a stack of books                            | Knowledge base, the help center section of the site  |
| `help-for-this-page` | On a browser window, pointing at part of it    | Contextual help                                      |
| `self-hosted`        | On the roof of a birdhouse                     | Setup screens, the hosting section                   |
| `plugs-in`           | On a cable about to be plugged in              | Install steps, the developer section                 |
| `flying`             | In flight, carrying a letter                   | A message sent, an invitation or email on its way    |
| `no-results`         | Looking through a magnifying glass             | A search or a filter that matched nothing            |
| `nothing-here`       | On the flap of an empty box                    | A view with nothing in it yet, when no other fits    |
| `error`              | On a tipped ink bottle, beside the spill       | A whole page that failed to load                     |
| `not-found`          | On a signpost pointing two ways                | A page or a record that does not exist               |
| `ticket`             | On a twig, holding a ticket in its beak        | No tickets yet, the tickets section of the site      |
| `resolved`           | Beside a rosette with a tick                   | A conversation resolved or rated                     |
| `team`               | Three wrens together on a wire                 | The team list, inviting the first colleague          |
| `settings`           | On the handle of a toolbox                     | Settings with nothing set up yet                     |
| `branding`           | On a paint pot, with a brush and a colour card | Brand and appearance settings                        |
| `notifications`      | On top of a ringing bell                       | Notification settings, asking to allow notifications |
| `attachments`        | Beside a sheet of paper with a large paperclip | No files yet, a place to drop files                  |
| `visitors`           | On a crate, looking through a telescope        | Nobody here yet: live visitors, no contacts          |
| `offline`            | On a pole, beside a wire snapped in two        | No connection, live updates lost                     |
| `welcome`            | Under a string of flags                        | First run, a new account                             |
| `sign-in`            | Holding a key, in front of a padlock           | Signing in, a page that needs permission             |
| `first-article`      | On an open book with blank pages, by a pencil  | A help center with no articles                       |
| `open-source`        | On angle brackets with a heart between them    | The open source section of the site                  |

- **Without the wren:** `bird={false}` leaves the wren out and keeps the things around it. Use it
  on a screen that carries someone else's brand, such as the visitor's chat. `EmptyState` takes
  the same prop. Every scene's wren group has the class `hw-bird`; a new scene needs it too.
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

### Compact controls

Text controls are 40px tall with 14px text, which suits touch. A dense screen used with a mouse
and keyboard, such as the dashboard, can ask for 36px and 13px: put the exported
`compactControls` classes on a container, and the `Input`, `Select`, `Combobox`, `TagsInput` and
`PhoneInput` inside it follow. Use `size="sm"` buttons beside them. `MessageBubble` has its own
`size="sm"`, and an `avatar` slot that replaces the name above the other person's messages.

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
  "1–25 of 132". Control it with `page` and `onPageChange`, for example to keep the page in the
  URL. The footer has a rows-per-page picker (`pageSizeOptions`, default 10, 25, 50 and 100, or
  `false`); a new size goes back to page 1. `pageSizeKey` remembers the choice in this browser;
  `onPageSizeChange` makes the size controlled. `showSummary`, `showPageControls` and
  `showPagination` turn off the count, the buttons or the whole footer. Below `mobileBreakpoint`
  (768px), `mobilePagination="load-more"` (the default) swaps previous and next for Load more,
  which adds the next page under the rows already shown ("Showing 50 of 132") and starts again
  when the key, the size or the page changes.
- **`none`** makes a single request with no paging.

States it draws for you, each replaceable:

| State                                 | Default                                    | Replace with                |
| ------------------------------------- | ------------------------------------------ | --------------------------- |
| First load                            | `AppLoader` with `messages.loading`        | `renderLoading`             |
| No items                              | `EmptyState` with `messages.empty`         | `renderEmpty`               |
| Failed with nothing to show           | A message and a "Try again" button         | `renderError`               |
| Failed with items showing (load more) | A compact message and retry under the list | `renderError`               |
| Refreshing with items showing         | `LinearProgress` pinned to the top         |                             |
| Loading the next page (infinite)      | A spinner under the last item              | `messages.loadingMore`      |
| Nothing more to load (infinite)       | The wren and "You\'ve reached the end."    | `renderEnd`, `messages.end` |
| Paging controls                       | Previous, "Page x of y", Next              | `renderPagination`          |

The end marker appears only after more than one page has loaded, so a list that fits on one page
is not followed by it. Return `null` from `renderEnd` to turn it off.

If you make the list its own scrolling box (`className="h-96 overflow-y-auto"`), it becomes a tab
stop while its content overflows, so a keyboard can scroll it with the arrow keys. `Table` does
the same for its scrolling container. Both use `useScrollableFocus` from `src/lib`; use it for
any other box that scrolls and may hold nothing focusable.

Also: `header` and `footer` around the items, `messages` for every piece of text, and
`listClassName` and `itemClassName`. For a table, use `QueryTable`. For a grid or another layout
of your own, pass `children` as a function: it receives the whole state (`items`, `status`,
`total`, `hasMore`, `loadMore`, `retry`, `refetch`, `pagination`, and the fetching flags) and you
draw everything.

### QueryTable

`QueryList` and `DataTable` together, for a fetched table. The page describes its columns, rows
and empty copy; the table draws the rest:

```tsx
<Panel aria-label="Contacts">
  <QueryTable
    queryKey={["contacts", search, filters]}
    queryFn={({ page, pageSize }) => api.contacts.list({ search, page, pageSize })}
    pageSize={25}
    noun={{ one: "contact", other: "contacts" }}
    caption="Contacts"
    columns={columns}
    getRowKey={(contact) => contact.id}
    filtered={search !== ""}
    empty={<EmptyState title="No contacts yet" />}
    toolbar={({ total }) => <PanelHeader>Contacts {total}</PanelHeader>}
  />
</Panel>
```

- **First load:** placeholder rows, and placeholder items on a phone. **Refresh:** a progress bar
  along the top of the rows, which stay on screen. A list on `refetchInterval` refreshes quietly.
- **Error:** a message (`messages.error`) and Try again; a failed refresh keeps its rows.
- **Empty:** `empty`, or `emptyFiltered` while `filtered` says a search or filter is narrowing the
  rows (default "No results" and a hint).
- **Paging:** the same footer and options as `QueryList`, pinned under the rows, which scroll.
- `toolbar` goes above the table through every state; as a function it reads the list's state.
- `renderMobileRow`, `rowProps`, `density` and `caption` go to `DataTable`. `reorder` works as
  there, and when `onReorder` returns a promise the dropped order stays until it settles.

### QueryDetail

```tsx
<QueryDetail queryKey={["contact", id]} queryFn={({ signal }) => api.contacts.get(id, { signal })}>
  {(contact, { refetch, isFetching }) => <ContactCard contact={contact} />}
</QueryDetail>
```

It draws the first load as a skeleton in a record panel's shape, a name beside an avatar and
sections of facts (`placeholder="loader"` for the `AppLoader` instead, or `renderLoading`); not
found when `queryFn` returns `null` or `isEmpty` says so, with `messages.notFound`,
`messages.notFoundDescription` and a `notFoundAction` such as Close (or `renderEmpty`); and
failure with a retry (`renderError`). Once the item is showing, a
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
| `phone`    | `PhoneInput` | Any `PhoneInput` prop: `defaultCountry`, `countries`, `preferredCountries`    |
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
popover, radio-group, select, separator, sheet, skeleton, sonner, spinner, switch, tabs, textarea,
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

| File           | Upstream                                                | Ours                                                                             |
| -------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `checkbox.tsx` | `<CheckIcon />`                                         | `<Icon name="check" />`                                                          |
| `dialog.tsx`   | `<XIcon />`                                             | `<Icon name="x" />`                                                              |
| `sheet.tsx`    | `<XIcon />`                                             | `<Icon name="x" />`                                                              |
| `select.tsx`   | `<CaretDownIcon />`, `<CaretUpIcon />`, `<CheckIcon />` | `<Icon name="caret-down" />`, `"caret-up"`, `"check"`                            |
| `spinner.tsx`  | `<SpinnerIcon aria-label="Loading" {...props} />`       | `<Icon label="Loading" {...props} name="spinner" />`                             |
| `sonner.tsx`   | `<CheckCircleIcon />`, `<InfoIcon />` and the rest      | `<Icon name="check-circle" />`, `"info"`, `"warning"`, `"x-circle"`, `"spinner"` |

In each file the import line becomes `import { Icon } from "#components/base/icon/icon"`.

`sonner.tsx` needs one more edit. Upstream reads the theme from `next-themes`, which the CLI
installs; remove the `useTheme` import, the `theme` prop and the package
(`pnpm --filter @helpwren/design-system remove next-themes`). Our toasts are drawn with tokens,
which already follow the `dark` class, so Sonner does not need to know the theme.

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

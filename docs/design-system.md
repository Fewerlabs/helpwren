# Design system

`@helpwren/design-system` holds the tokens, components and illustrations. Feature code imports
from this package only.

> Being built in phases. This page gains a section per component as each one lands.

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

| Utility name                   | Light     | Dark      | Use                                                |
| ------------------------------ | --------- | --------- | -------------------------------------------------- |
| `background` / `paper`         | `#F7F4ED` | `#1C1A16` | Page background                                    |
| `card`, `popover`              | `#FDFBF7` | `#24211C` | Cards, panels, inputs                              |
| `foreground` / `ink`           | `#26231E` | `#EDE8DC` | Text, icons, outlines                              |
| `muted-foreground` / `pencil`  | `#6E675B` | `#A39B8B` | Secondary text                                     |
| `border`, `input` / `edge`     | `#8F8778` | `#827B6E` | Borders of controls and cards                      |
| `rule`                         | `#E3DDD0` | `#3A362F` | Dividers only, never control borders               |
| `muted`, `secondary`, `accent` | `#EDE9E0` | `#2E2A24` | Hover and secondary fills                          |
| `primary` / `moss`             | `#3D6B57` | `#7FB59A` | Primary buttons, brand accent                      |
| `destructive` / `pen`          | `#B23520` | `#F07A5A` | Destructive actions, errors, urgent                |
| `highlighter`                  | `#F5D547` | `#E8C64A` | Behind single words, with `highlighter-foreground` |
| `ring` / `biro`                | `#2F5B85` | `#8DB3DB` | Links, focus ring, internal notes                  |
| `ochre`                        | `#7D5A12` | `#D9A441` | Waiting                                            |

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
  shown with a 2px biro outline.
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

| Layer    | What it holds                                     | Who may import it                |
| -------- | ------------------------------------------------- | -------------------------------- |
| `ui`     | shadcn/ui output, kept close to upstream          | `base` only                      |
| `base`   | Our primitives, with our API, variants and styles | `shared`, and everything outside |
| `shared` | Composed, reusable pieces with no business logic  | Everything outside               |

ESLint enforces the boundaries. The reasoning is in
[ADR 0002](decisions/0002-component-layers.md).

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

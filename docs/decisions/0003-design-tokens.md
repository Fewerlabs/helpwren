# 0003: Design tokens

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Helpwren has its own brand (warm paper, ink lines, moss accent) and uses shadcn/ui, which expects
a fixed set of semantic CSS variables. The widget must also be re-brandable by the product that
embeds it, and every colour pairing has to meet WCAG AA. The brand boards in `docs/brand/` define
the palette.

## Decision

**CSS variables are the single source of truth.** `packages/design-system/src/tokens/tokens.css`
defines every colour once for light (`:root`) and once for dark (`.dark`). Nothing else holds a
hex value: the TypeScript export (`tokens`) contains `var(--name)` references, and the contrast
test and the Storybook palette page parse the stylesheet itself.

**Three tiers of names.**

1. _Brand palette:_ `--paper`, `--ink`, `--pencil`, `--edge`, `--rule`, `--moss`, `--pen`,
   `--highlighter`, `--biro`, `--ochre`, and `--status-*` with a matching `-surface`.
2. _Semantic roles_, in shadcn/ui's vocabulary, pointing at the palette: `--background` is paper,
   `--primary` is moss, `--destructive` is red pen, `--ring` is the accent (moss by default), `--border` and `--input` are
   edge.
3. _Tailwind utilities_, generated from both tiers by `@theme inline` in `theme.css`
   (`bg-background`, `text-pencil`, `bg-status-open-surface`).

**Adopter overrides are separate, namespaced variables.** `--primary` is defined as
`var(--helpwren-accent, var(--moss))`, and likewise for `--helpwren-accent-foreground`,
`--helpwren-font` and `--helpwren-radius`. An adopter sets four documented variables and never
needs to know our internal names.

**Dark mode is a `.dark` class** on any ancestor, following shadcn/ui. It is not tied to
`prefers-color-scheme` in CSS, so the host app or widget decides.

**Contrast is tested, not asserted.** `contrast-pairs.ts` lists every pair of tokens allowed to
appear together with its minimum ratio (4.5:1 for text, 3:1 for edges and focus rings). A test
checks each pair in both themes, and fails if a colour token exists that no pair covers.

**Shadows are removed at the theme level.** Tailwind's `--shadow-*` values are set to nothing, so
shadcn components lose their shadows without edits to `ui` files. Focus rings use ring utilities
and outlines, which are unaffected.

## Values not on the brand boards

- **Dark status tints** were derived by mixing 16% of each dark status colour into dark paper,
  then verified at 4.5:1 or better.
- **`--wash`** (`#EDE9E0` light, `#2E2A24` dark) is the muted surface for hover and secondary
  fills. The light value is the closed-status tint from the palette board.
- **`--highlighter-foreground`** exists because ink is light in dark mode and would be unreadable
  on the highlighter.
- **`--primary-foreground` and `--destructive-foreground`** are white in light mode and dark paper
  in dark mode, where moss and red pen become light colours.

## Consequences

- Changing a colour is a one-line edit that the contrast test checks immediately.
- A new colour token cannot be added without declaring where it may be used.
- `edge` on a muted surface is 2.9:1 in light mode, just under 3:1. Outlined controls therefore
  sit on paper or card, never on a muted surface; that pair is deliberately not in the list.
- An adopter's accent is not contrast-checked by us. The docs tell them to set
  `--helpwren-accent-foreground` to match.

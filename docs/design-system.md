# Design system

`@helpwren/design-system` holds the tokens, components and illustrations. Feature code imports
from this package only.

> Being built in phases. This page gains a section per component as each one lands.

## Look

Calm interface, hand-drawn character. Warm paper, ink lines, generous space. Outlines instead of
shadows. Personality comes from the wren illustrations, never from decoration in the product UI.

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

# @helpwren/design-system

Tokens, components and illustrations for Helpwren. Feature code imports from this package only.

```
src/
  tokens/         CSS variables (light and dark), Tailwind theme, TS token exports
  components/
    ui/           shadcn/ui output. Internal; only base may import it
    base/         Our core primitives
    shared/       Composed, reusable pieces
  illustrations/  The wren scenes and the logo as React components
  lib/            cn() and small helpers
  index.ts        Public exports: base, shared, illustrations, tokens. Not ui
```

## Commands

```bash
pnpm --filter @helpwren/design-system storybook   # Storybook on http://localhost:6006
pnpm --filter @helpwren/design-system test        # unit tests and story tests (with a11y checks)
pnpm --filter @helpwren/design-system build       # static Storybook
```

Story tests run in headless Chromium. Install it once with `pnpm exec playwright install chromium`.

See [`docs/design-system.md`](../../docs/design-system.md) for usage guidance.

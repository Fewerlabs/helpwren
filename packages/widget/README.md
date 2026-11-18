# helpwren

> **Status: stub.** Nothing is implemented yet. This package exists so the workspace layout,
> naming and tooling are settled before product work starts.

The embeddable Helpwren widget script loaded by host sites.

## What it will contain

- The `Helpwren` script object: `init`, `identify`, `reset`, `show`, `hide`, `open`,
  `setContext` and `on`.
- The launcher button and the iframe that opens the support app's `/embed` page.
- Inline contextual help placeholders (`data-helpwren-help`).
- Widget configuration validated with Zod, with accent colour, font and radius exposed as
  overridable CSS variables.

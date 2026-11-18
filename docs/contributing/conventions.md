# Conventions

## TypeScript

- Strict mode, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- No `any`. Use `unknown` and narrow it, or write the type.
- Use `import { type Foo }` for type-only imports; lint fixes this for you.
- Named exports only. Default exports are allowed only where a tool requires them (Next.js route
  files, Storybook stories, configuration files).

## Validation

Every external boundary is parsed with Zod: environment variables, API input and output, forms
and widget configuration. Declare the schema once and infer the type from it with `z.infer`; do
not write the type a second time.

## Imports

- Imports are ordered and grouped by lint: Node built-ins, packages, then relative paths.
- Feature code imports UI from `@helpwren/design-system`, never from a component's file path.
- Code outside a feature imports that feature only through its `index.ts`.
- Icons come from the `Icon` component. Only its registry may import the icon library.

## Styling

- Tailwind utilities, with classes merged through `cn()`.
- Colours, radii and fonts come from design tokens. Do not hard-code hex values in components.
- Variants are declared with `cva`.

## Lint and formatting

- Prettier formats everything, including Tailwind class order.
- Lint must pass with no warnings.
- An `eslint-disable` comment needs the reason written on the same line.
- No dead code and no commented-out code. Delete it; git remembers.

## Tests

- Vitest with Testing Library. Test behaviour through roles and labels, as a user would find
  things, not implementation details.
- Test files sit beside the code as `*.test.ts(x)`.
- Every Storybook story also runs as a test with an accessibility check.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), checked by a commit hook. Use the
package as the scope where it helps: `feat(design-system): add StatusChip`.

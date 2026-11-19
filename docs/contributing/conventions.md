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
- An icon people choose from all of Phosphor, such as a collection's, is drawn with
  `CollectionIcon`, which loads its SVG from `/api/icons`, and chosen with `IconPicker`. Never
  import arbitrary Phosphor components to draw one.

## Use the component that already does it

Before writing markup for something fetched, chosen or filtered, check the design system. If a
component draws it, use that component. Do not rebuild its loading, empty and error states by
hand.

| For                                               | Use                                           |
| ------------------------------------------------- | --------------------------------------------- |
| A fetched list, with paging or infinite scrolling | `QueryList`                                   |
| One fetched record                                | `QueryDetail`                                 |
| A table driven by data                            | `DataTable`, inside `QueryList` when it pages |
| Changing a value in place, in a row or a panel    | `InlineSelect`                                |
| A choice in a form                                | `Select`                                      |
| Narrowing a list                                  | `FilterBar`, with `SearchField` for text      |
| Nothing to show, or a failure                     | `EmptyState`                                  |
| Confirming an action before it happens            | `ConfirmDialog`, or `useConfirm` from code    |
| Telling the person something happened             | `toast`                                       |

- A component should not call `useQuery` and then branch on `isPending` and `isError` to draw
  skeletons and a retry button. That is what `QueryList` and `QueryDetail` are for.
- `useQuery` in a hook is still right when no single component owns the result: a count shown in
  the navigation, a team list several panels read, or one record that two sibling panels both
  draw from (the open conversation in the inbox). Say why in a comment on the hook.
- The message thread is another exception. It pages backwards and is patched by live updates,
  so it keeps its own hook (`features/conversation/hooks/use-thread.ts`). So is the visitor's
  chat, where the session and conversations decide which screen to show before any list exists.
- Put a list's query key under its feature's key (`INBOX_QUERY_KEY`, `CONTACTS_QUERY_KEY`), so one
  invalidation refreshes everything that might have changed.
- If the component nearly fits, extend it in the design system. Do not write a one-off beside it.

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

# Component layers

| Folder    | Holds                                            | May import from         |
| --------- | ------------------------------------------------ | ----------------------- |
| `ui/`     | shadcn/ui output, kept close to upstream         | `lib`                   |
| `base/`   | Our primitives: our API, variants and styles     | `ui`, `lib`, `tokens`   |
| `shared/` | Composed, reusable pieces with no business logic | `base`, `shared`, `lib` |

ESLint enforces these boundaries. Only `base` and `shared` are exported from the package.
See [ADR 0002](../../../../docs/decisions/0002-component-layers.md).

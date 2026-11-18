# Example feature: canned replies

A small, complete feature that shows every convention in one place. Copy its shape for a real
feature, then delete this folder when the first real one exists.

| Folder        | Holds                                                 | Here                                       |
| ------------- | ----------------------------------------------------- | ------------------------------------------ |
| `schemas/`    | Zod schemas, and the types inferred from them         | `canned-reply.ts`                          |
| `api/`        | Data access. Answers are parsed with a schema         | `canned-replies.ts` (in memory for now)    |
| `store/`      | A Zustand store for this feature's client state       | `example-store.ts`: search text, dialog    |
| `hooks/`      | Hooks that combine the above                          | `use-canned-replies.ts`: keys and mutation |
| `components/` | UI, built only from `@helpwren/design-system`         | List, form, and the composed feature       |
| `index.ts`    | The public API. Nothing else is imported from outside | `CannedReplies`, and the types             |

See [`docs/architecture.md`](../../../../../docs/architecture.md) for the reasoning.

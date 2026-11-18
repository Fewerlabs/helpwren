# 0005: A form layer in the design system

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Forms are written with React Hook Form and validated with Zod schemas. Wiring each control by
hand repeats the same code per field: a `Controller`, a `Field` for the label and message, and
the mapping between the control's value props and the form's. It is also where accessibility
slips, when an error is rendered but not connected to its control.

## Decision

Add a `form` layer beside `data`, above `shared` (see
[ADR 0004](0004-data-layer.md) for the layer rules). It holds `FieldList`, which takes
`form.control` and a list of field descriptions and renders the controls.

- **The caller keeps the form.** `useForm`, the schema, the `<form>` element and the submit
  handler stay in feature code. `FieldList` renders fields only, so it never decides what
  submitting means.
- **Descriptions are typed against the schema.** `name` must be a path in the form's values, and
  `props` are the props of the control that `type` selects.
- **`custom` is the escape hatch.** A field can render any control and still get its label, hint
  and error.
- **Only `form` may import React Hook Form**, and `ui`, `base` and `shared` may not import
  `form`. ESLint enforces both. React Hook Form is an optional peer dependency.

## Consequences

- A typical settings form is a schema plus a list, with no per-field wiring.
- Layouts beyond a one to three column grid still use `Field` and `Controller` directly.
- A new control type means adding a case to `FieldList`; until then `custom` covers it.

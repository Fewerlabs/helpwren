# @helpwren/config

Shared configuration for every workspace in the monorepo. Private; never published.

| Export                                           | Use                                                    |
| ------------------------------------------------ | ------------------------------------------------------ |
| `@helpwren/config/typescript/base.json`          | Strict TypeScript for plain libraries                  |
| `@helpwren/config/typescript/react-library.json` | Adds DOM libs and the React JSX runtime                |
| `@helpwren/config/typescript/nextjs.json`        | For the Next.js app                                    |
| `@helpwren/config/eslint/base`                   | typescript-eslint strict, import ordering              |
| `@helpwren/config/eslint/react`                  | Base plus React, hooks and jsx-a11y (strict)           |
| `@helpwren/config/eslint/next`                   | React plus the Next.js plugin                          |
| `@helpwren/config/prettier`                      | Prettier with Tailwind class sorting (`cn`, `cva` too) |

Tailwind CSS v4 is configured in CSS, so there is no JavaScript Tailwind preset here. The theme
lives in `@helpwren/design-system` (`src/tokens`).

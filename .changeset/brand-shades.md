---
"@helpwren/design-system": minor
---

Add `brandShades`, `readableShade`, `inkOn` and `withLightness`: shades of one brand colour,
worked out in OKLCH so they keep its hue, that stay readable on the light and the dark theme's
surfaces. `brand.css` picks the light or dark set on any element marked `data-brand`, and the
`brand-ink` colour draws words and icons in a readable shade of the brand.

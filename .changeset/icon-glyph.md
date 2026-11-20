---
"@helpwren/design-system": minor
---

Add `IconGlyph`, `Icon` given the icon itself instead of its name, for components sent to the
browser that need only a few icons. `ThemeMenu` and `CodeSnippet` use it, so a page that shows
them downloads their few icons, not the whole set.

---
"@helpwren/design-system": minor
---

`ActionMenu` stays open while an action runs: return a promise from an item's `onSelect`, or set its `loading`, and the item shows a spinner until it is done. Items can also hold `choices`, a menu of their own, and the menu takes its own `trigger`. Add `SelectionBar`, and `selection` on `QueryTable`, for ticking rows and acting on them together.

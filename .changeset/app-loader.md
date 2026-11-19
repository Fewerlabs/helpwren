---
"@helpwren/design-system": minor
---

Add `AppLoader`, a loading state drawn by hand: the wren draws itself for as long as the wait
lasts. It is now the default first-load state of `QueryList` and `QueryDetail`, in place of
skeleton rows, and `QueryList` no longer takes `loadingRows`. Pass `renderLoading` for anything
else.

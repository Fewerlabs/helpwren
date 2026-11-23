---
"@helpwren/design-system": minor
"@helpwren/core": minor
"@helpwren/web": minor
---

Adding a picture to an article opens a window: drag pictures in or choose files, or pick one already uploaded. Add `ImageLibraryDialog`, `imagePicker` on `RichTextEditor`, and `articles.listImages()`. Needs the migration `20261206100000_article_image_library`, which lets the team list the pictures in the articles bucket.

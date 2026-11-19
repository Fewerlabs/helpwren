---
"@helpwren/design-system": minor
---

Add `RichTextEditor`, a Notion-like editor for long writing (a slash menu of blocks, a bar over
selected text, Markdown shortcuts, pictures and callouts), and `RichText`, which draws its
documents on the server and cannot be made to run a script. Add `richTextHeadings`, `safeHref`
and the icons the editor and the help center use.
Beside the block under the pointer the editor shows a plus, which adds a block below, and a grip,
which drags the block or opens a menu to turn it into another kind, duplicate it or delete it.
`ArticleCard` takes an `icon`, for a card that stands for a collection.
`RichText` draws code blocks as `CodeSnippet`, with a copy button.

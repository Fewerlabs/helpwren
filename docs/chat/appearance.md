# Appearance

Set the widget's brand, colours, position and size for every site or for one page.

**Settings → Branding** applies everywhere. A page can change its own copy with the `appearance`
and `layout` options.

## Branding

Branding has four tabs, each with a live preview:

- **Brand**: the brand name, logo (PNG, JPG or WebP, up to 1 MB), brand colour (with presets
  and gradients), button colour, and whether to show "Powered by Helpwren".
- **Widget**: the launcher's position (bottom right or bottom left), its icon (a chat bubble,
  the wren in a bubble, or your logo), its space from the side and the bottom (0 to 120
  pixels), the greeting and the line under it, a welcome message shown beside the launcher,
  up to five quick replies of up to 60 characters each, and which tabs the chat shows. See
  [Tabs](#tabs).
- **Chat page**: the title, the line under it, and the background (brand colour, plain or a
  picture) of `/chat`.
- **Help center**: the same for `/help`, with its links and search settings. See
  [Search engines](../help-center/seo.md).

The chat follows the visitor's light or dark setting.

## Tabs

The chat has three tabs along the bottom: **Home**, **Messages** and **Help**. Under
**Settings → Branding → Widget → Tabs** you can turn Home and Help off. Messages always shows.

| Tabs shown     | What the visitor sees                      |
| -------------- | ------------------------------------------ |
| All three      | The chat opens on Home                     |
| No Home        | The chat opens on Messages                 |
| No Help        | Home leaves out **Search all articles**    |
| Messages alone | No row of tabs; the chat opens on Messages |

The home screen lists the ways to write first, then the visitor's most recent conversation, then
[help for the page](../contextual-help.md) and suggested articles.

## Change it for one page

```js title="index.html"
Helpwren.init({
  appearance: {
    position: "left",
    offsetX: 24,
    offsetY: 96,
    accent: "#1d4ed8",
    accentTo: "#7c3aed",
    accentInk: "#ffffff",
    launcher: "wren",
  },
  layout: { width: 440, height: 720, zIndex: 1000 },
});
```

| `appearance` | What it does                                                                          |
| ------------ | ------------------------------------------------------------------------------------- |
| `position`   | `right` or `left`                                                                     |
| `offsetX`    | Pixels from the side, 0 to 120                                                        |
| `offsetY`    | Pixels from the bottom, 0 to 120                                                      |
| `accent`     | The launcher's colour, as six-digit hex such as `#1d4ed8`                             |
| `accentTo`   | A second colour the launcher fades to                                                 |
| `accentInk`  | The colour of the icon on the launcher. Default `#ffffff`                             |
| `launcher`   | `chat` (a chat bubble), `wren` (the wren in a bubble) or `logo` (your logo, when set) |

A new `accent` brings its own `accentTo` and `accentInk`, or none, so a colour from Branding
never mixes with one from the page.

| `layout` | What it does                                                   |
| -------- | -------------------------------------------------------------- |
| `width`  | The floating panel's width in pixels, 320 to 640. Default 400  |
| `height` | The floating panel's height in pixels, 420 to 900. Default 680 |
| `zIndex` | The widget's `z-index`, for a page with layers of its own      |

## Reading an article

On a screen wider than 640 pixels, an article opened in the floating panel opens at a reading
size: the panel grows from its corner up to 760 by 860 pixels, never past the screen, whatever
`layout` sets. **Collapse article**, beside the close button, puts it back for that article, and
**Expand article** grows it again. Going back from the article, opening another screen or
closing the chat puts it back too. On a phone, where the chat already fills the screen, inline,
and on the chat page, the panel keeps its size.

## Change it after init

`Helpwren.update` changes `appearance` or `layout` later, for example when your site switches
theme:

```js title="app.js"
Helpwren.update({ appearance: { accent: dark ? "#7fb59a" : "#3d6b57" } });
```

The welcome message beside the launcher can be turned off for a page with `welcome: false`.

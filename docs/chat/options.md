# Options

Every option `Helpwren.init` takes, for one page.

All are optional. **Settings → Branding** sets the defaults for every site, and options given
here win over it for this page.

```js title="index.html"
Helpwren.init({
  source: "web",
  launcher: true,
  appearance: { position: "left", accent: "#1d4ed8" },
  layout: { width: 420, height: 720 },
});
```

| Option       | What it does                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`     | This page's name, shown to your team as the [channel](../concepts.md#channel). Default `web`.                                                             |
| `audience`   | Whose help articles the chat lists, such as `business`, besides those for everyone. See [Audiences](../help-center/index.md#audiences).                   |
| `launcher`   | `false` hides the round button, for a site that opens the chat from its own.                                                                              |
| `trigger`    | Your own buttons or links that open and close the chat: a CSS selector, an element or a list of elements. Each gets `aria-expanded`.                      |
| `mode`       | `floating` (default) is a launcher and a panel. `inline` puts the chat straight into `container`, always open, with no launcher.                          |
| `container`  | An element, or a CSS selector for one. Inline, the chat fills it. Floating, the launcher and panel sit inside it and it must be positioned.               |
| `appearance` | Your own `position` (`right` or `left`), `offsetX`, `offsetY` (pixels, up to 120), `accent`, `accentTo`, `accentInk` (six-digit hex) and `launcher` icon. |
| `layout`     | `width` (320 to 640, default 400) and `height` (420 to 900, default 680) of the floating panel in pixels, and `zIndex`.                                   |
| `welcome`    | `false` keeps the welcome message and quick replies from showing beside the launcher.                                                                     |
| `open`       | `true` starts with the chat open.                                                                                                                         |
| `theme`      | `light` (default), `dark`, or `system` to follow the visitor's device. See [Light and dark](appearance.md#light-and-dark).                                |

> [!NOTE]
> Values outside a range are brought into it, and anything that is not a valid colour, number or
> address is ignored, so a mistake leaves the widget as it was.

[Appearance](appearance.md) covers `appearance` and `layout` in more detail, and how to change
them after `init`.

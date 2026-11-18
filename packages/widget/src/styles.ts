// The widget's own styles. They live in a shadow root, so the host page's CSS cannot reach
// them and they cannot leak out. Colours follow the design system's tokens.
export const styles = `
:host {
  all: initial;
  --hw-accent: #3d6b57;
  --hw-accent-fill: var(--hw-accent);
  --hw-accent-ink: #ffffff;
  --hw-x: 20px;
  --hw-y: 20px;
  --hw-surface: #ffffff;
  --hw-edge: #e3ddd0;
  --hw-ink: #26231e;
}

* { box-sizing: border-box; }

.launcher {
  position: fixed;
  right: var(--hw-x);
  bottom: var(--hw-y);
  z-index: 2147483000;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--hw-accent-fill);
  color: var(--hw-accent-ink);
  cursor: pointer;
  transition: transform 150ms ease;
}
.launcher:hover { transform: scale(1.05); }
.launcher:active { transform: scale(0.97); }
.launcher:focus-visible { outline: 2px solid var(--hw-accent); outline-offset: 3px; }
.launcher svg { width: 26px; height: 26px; }
.launcher img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.launcher [data-icon="close"],
.launcher[aria-expanded="true"] [data-icon="open"] { display: none; }
.launcher[aria-expanded="true"] [data-icon="close"] { display: block; }

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border: 2px solid var(--hw-surface);
  border-radius: 10px;
  background: var(--hw-ink);
  color: var(--hw-surface);
  font: 600 11px/16px system-ui, sans-serif;
  text-align: center;
}
.badge[hidden] { display: none; }

.panel {
  position: fixed;
  right: var(--hw-x);
  bottom: calc(var(--hw-y) + 64px);
  z-index: 2147483000;
  width: 400px;
  max-width: calc(100vw - var(--hw-x) * 2);
  height: 680px;
  max-height: calc(100vh - var(--hw-y) - 84px);
  max-height: calc(100dvh - var(--hw-y) - 84px);
  overflow: hidden;
  border: 1px solid var(--hw-edge);
  border-radius: 20px;
  background: var(--hw-surface);
  box-shadow: 0 12px 40px rgb(38 35 30 / 0.16);
  transform-origin: bottom right;
  transition: opacity 150ms ease, transform 150ms ease, visibility 150ms;
}
.panel[data-open="false"] {
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  pointer-events: none;
}
.panel iframe { display: block; width: 100%; height: 100%; border: 0; }

:host([data-position="left"]) .launcher,
:host([data-position="left"]) .panel { right: auto; left: var(--hw-x); }
:host([data-position="left"]) .panel { transform-origin: bottom left; }

/* Inside an element of the page's own, in place of the whole page. */
:host([data-contained]) .launcher,
:host([data-contained]) .panel { position: absolute; z-index: 1; }
:host([data-contained]) .panel {
  max-width: calc(100% - var(--hw-x) * 2);
  max-height: calc(100% - var(--hw-y) - 84px);
}

/* On a phone the chat takes the whole screen, and its own close button closes it. */
@media (max-width: 480px) {
  :host(:not([data-contained])) .panel {
    inset: 0;
    width: 100%;
    max-width: none;
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
  }
  :host(:not([data-contained])) .launcher[aria-expanded="true"] { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .launcher, .panel { transition: none; }
}
`;

export const openIcon = `<svg data-icon="open" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128 24a104 104 0 0 0-91.8 152.9L25.4 209.3a16 16 0 0 0 20.3 20.3l32.4-10.8A104 104 0 1 0 128 24Zm0 192a88 88 0 0 1-44.1-11.8 8 8 0 0 0-6.5-.7L40.6 215.4l11.9-36.8a8 8 0 0 0-.7-6.5A88 88 0 1 1 128 216Z"/></svg>`;

export const closeIcon = `<svg data-icon="close" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M213.7 101.7 133.7 181.7a8 8 0 0 1-11.4 0l-80-80a8 8 0 0 1 11.4-11.4L128 164.7l74.3-74.4a8 8 0 0 1 11.4 11.4Z"/></svg>`;

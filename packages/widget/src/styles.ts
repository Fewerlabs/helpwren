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

/* The welcome message beside the launcher, before the chat has been opened. */
.teaser {
  position: fixed;
  right: var(--hw-x);
  bottom: calc(var(--hw-y) + 66px);
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  width: 320px;
  max-width: calc(100vw - var(--hw-x) * 2);
  font: 400 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--hw-ink);
  animation: hw-rise 220ms ease both;
}
.teaser[hidden] { display: none; }
.teaser-card {
  position: relative;
  width: 100%;
  border-radius: 16px;
  background: var(--hw-surface);
  box-shadow: 0 8px 28px rgb(38 35 30 / 0.14), 0 0 0 1px rgb(38 35 30 / 0.05);
}
.teaser-open {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 34px 12px 12px;
  border: 0;
  border-radius: 16px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.teaser-avatar {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--hw-accent-fill);
  color: var(--hw-accent-ink);
  font-weight: 600;
}
.teaser-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
/* A dot that says someone is there. */
.teaser-avatar::after {
  content: "";
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border: 2px solid var(--hw-surface);
  border-radius: 50%;
  background: #3fb950;
}
.teaser-words { display: grid; min-width: 0; }
.teaser-name { color: #6f6a5f; font-size: 12px; font-weight: 500; }
.teaser-name:empty { display: none; }
.teaser-message { overflow-wrap: anywhere; }
.teaser-close {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: #8c8779;
  cursor: pointer;
}
.teaser-close:hover { background: rgb(38 35 30 / 0.06); color: var(--hw-ink); }
.teaser-close svg { width: 12px; height: 12px; }
.teaser-replies { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.chip {
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--hw-surface);
  box-shadow: 0 4px 14px rgb(38 35 30 / 0.12), 0 0 0 1px rgb(38 35 30 / 0.05);
  color: var(--hw-ink);
  font: 500 13px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif;
  cursor: pointer;
  transition: transform 120ms ease;
}
.chip:hover { transform: translateY(-1px); }
.teaser-open:focus-visible, .teaser-close:focus-visible, .chip:focus-visible {
  outline: 2px solid var(--hw-accent);
  outline-offset: 2px;
}
@keyframes hw-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

:host([data-position="left"]) .launcher,
:host([data-position="left"]) .teaser,
:host([data-position="left"]) .panel { right: auto; left: var(--hw-x); }
:host([data-position="left"]) .teaser { align-items: flex-start; }
:host([data-position="left"]) .teaser-replies { justify-content: flex-start; }
:host([data-position="left"]) .panel { transform-origin: bottom left; }

/* Inside an element of the page's own, in place of the whole page. */
:host([data-contained]) .launcher,
:host([data-contained]) .teaser,
:host([data-contained]) .panel { position: absolute; z-index: 1; }
:host([data-contained]) .teaser { max-width: calc(100% - var(--hw-x) * 2); }
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
  .launcher, .panel, .chip { transition: none; }
  .teaser { animation: none; }
}
`;

export const openIcon = `<svg data-icon="open" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128 24a104 104 0 0 0-91.8 152.9L25.4 209.3a16 16 0 0 0 20.3 20.3l32.4-10.8A104 104 0 1 0 128 24Zm0 192a88 88 0 0 1-44.1-11.8 8 8 0 0 0-6.5-.7L40.6 215.4l11.9-36.8a8 8 0 0 0-.7-6.5A88 88 0 1 1 128 216Z"/></svg>`;

export const closeIcon = `<svg data-icon="close" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M213.7 101.7 133.7 181.7a8 8 0 0 1-11.4 0l-80-80a8 8 0 0 1 11.4-11.4L128 164.7l74.3-74.4a8 8 0 0 1 11.4 11.4Z"/></svg>`;

export const dismissIcon = `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.7 194.3a8 8 0 0 1-11.4 11.4L128 139.3l-66.3 66.4a8 8 0 0 1-11.4-11.4L116.7 128 50.3 61.7a8 8 0 0 1 11.4-11.4L128 116.7l66.3-66.4a8 8 0 0 1 11.4 11.4L139.3 128Z"/></svg>`;

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
  --hw-w: 400px;
  --hw-h: 680px;
  --hw-z: 2147483000;
  --hw-surface: #ffffff;
  --hw-edge: #e4e4e7;
  --hw-ink: #18181b;
}

/* The page asked for dark, or for the device's setting on a dark device (the chat's own dark
   tokens: --card-surface, --rule and --ink). */
:host([data-theme="dark"]) {
  --hw-surface: #161616;
  --hw-edge: #262626;
  --hw-ink: #e5e5e5;
}
@media (prefers-color-scheme: dark) {
  :host([data-theme="system"]) {
    --hw-surface: #161616;
    --hw-edge: #262626;
    --hw-ink: #e5e5e5;
  }
}

* { box-sizing: border-box; }

.launcher {
  position: fixed;
  right: var(--hw-x);
  bottom: var(--hw-y);
  z-index: var(--hw-z);
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
  z-index: var(--hw-z);
  width: var(--hw-w);
  max-width: calc(100vw - var(--hw-x) * 2);
  height: var(--hw-h);
  max-height: calc(100vh - var(--hw-y) - 84px);
  max-height: calc(100dvh - var(--hw-y) - 84px);
  overflow: hidden;
  border: 1px solid var(--hw-edge);
  border-radius: 20px;
  background: var(--hw-surface);
  box-shadow: 0 12px 40px rgb(24 24 27 / 0.16);
  transform-origin: bottom right;
  transition:
    opacity 150ms ease,
    transform 150ms ease,
    visibility 150ms,
    width 240ms cubic-bezier(0.2, 0, 0, 1),
    height 240ms cubic-bezier(0.2, 0, 0, 1);
}
/* Grown to read an article, from the same corner. Still within the screen's own bounds. */
:host([data-expanded]) .panel {
  width: min(760px, 92vw);
  height: min(860px, 90vh);
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
  z-index: var(--hw-z);
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
  box-shadow: 0 8px 28px rgb(24 24 27 / 0.14), 0 0 0 1px rgb(24 24 27 / 0.05);
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
/* A logo sits on the teaser's own surface, so a transparent one blends in, whole. */
.teaser-avatar[data-logo] { background: var(--hw-surface); }
.teaser-avatar img { width: 100%; height: 100%; padding: 4px; object-fit: contain; }
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
.teaser-name { color: #5f6c65; font-size: 12px; font-weight: 500; }
.teaser-name:empty { display: none; }
/* A long reply is cut to three lines; the chat has the rest. */
.teaser-message {
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
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
.teaser-close:hover { background: rgb(24 24 27 / 0.06); color: var(--hw-ink); }
.teaser-close svg { width: 12px; height: 12px; }
.teaser-replies { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.chip {
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--hw-surface);
  box-shadow: 0 4px 14px rgb(24 24 27 / 0.12), 0 0 0 1px rgb(24 24 27 / 0.05);
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

/* Inline: the chat is the content of its container, as large as it down to a usable size. */
:host([data-mode="inline"]) {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 280px;
  min-height: 420px;
}
/* Named with both attributes so it outranks the rules for floating inside a container. */
:host([data-mode="inline"][data-contained]) .panel {
  position: static;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  border: 0;
  border-radius: inherit;
  box-shadow: none;
  transition: none;
}
:host([data-contained]) .panel {
  max-width: calc(100% - var(--hw-x) * 2);
  max-height: calc(100% - var(--hw-y) - 84px);
}

/* On a phone, upright or on its side, the chat takes the whole screen, and its own close
   button closes it. The widget's FLOATING_SCREEN query is the opposite of this one. */
@media (max-width: 640px), (max-height: 480px) {
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

export const openIcon = `<svg data-icon="open" data-mark="chat" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128 24a104 104 0 0 0-91.8 152.9L25.4 209.3a16 16 0 0 0 20.3 20.3l32.4-10.8A104 104 0 1 0 128 24Zm0 192a88 88 0 0 1-44.1-11.8 8 8 0 0 0-6.5-.7L40.6 215.4l11.9-36.8a8 8 0 0 0-.7-6.5A88 88 0 1 1 128 216Z"/></svg>`;

// A filled speech bubble with the wren cut out of it. The cut-out shape reads at 26px where a
// line drawing of the bird would not.
export const wrenIcon = `<svg data-icon="open" data-mark="wren" viewBox="0 0 256 256" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M128 24a104 104 0 0 0-91.8 152.9L25.4 209.3a16 16 0 0 0 20.3 20.3l32.4-10.8A104 104 0 1 0 128 24ZM194.8 112.8 173.5 114.9C169.2 100.3 157 90.9 142.2 90.9 124.6 90.9 107.1 99 96.2 115.2 86.8 105.8 80.1 92.2 77.3 77.4L65.2 82.8C69.2 100.3 78.7 119.2 88.2 131.4 88.2 155.7 105.7 171.9 130 173.2 155.7 174.6 175.9 154.4 175.9 130.1 175.9 127.4 175.9 125.5 175.4 123.6ZM162.7 114.4A5.7 5.7 0 1 0 151.3 114.4 5.7 5.7 0 1 0 162.7 114.4Z"/></svg>`;

export const closeIcon = `<svg data-icon="close" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M213.7 101.7 133.7 181.7a8 8 0 0 1-11.4 0l-80-80a8 8 0 0 1 11.4-11.4L128 164.7l74.3-74.4a8 8 0 0 1 11.4 11.4Z"/></svg>`;

export const dismissIcon = `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.7 194.3a8 8 0 0 1-11.4 11.4L128 139.3l-66.3 66.4a8 8 0 0 1-11.4-11.4L116.7 128 50.3 61.7a8 8 0 0 1 11.4-11.4L128 116.7l66.3-66.4a8 8 0 0 1 11.4 11.4L139.3 128Z"/></svg>`;

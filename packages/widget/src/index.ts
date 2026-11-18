// The script a host site loads: <script src="https://support.example.com/widget.js"></script>.
// It defines `window.Helpwren` and nothing else.
import { createWidget, type HelpwrenWidget } from "./widget";

declare global {
  interface Window {
    Helpwren?: HelpwrenWidget;
  }
}

// The script is served by the install it belongs to, so its own address says where that is.
const script = document.currentScript;
if (script instanceof HTMLScriptElement && script.src) {
  window.Helpwren ??= createWidget(new URL(script.src).origin);
} else {
  console.error(
    "Helpwren: load widget.js with a plain <script src> tag, so it can tell where it came from.",
  );
}

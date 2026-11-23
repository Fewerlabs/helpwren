// The part of `window.Helpwren` this example uses. widget.js defines it once it loads.
// The full list is in the docs: docs/chat/methods.md.
interface HelpwrenWidget {
  init: (options?: { source?: string; trigger?: string }) => void;
  toggle: () => void;
  startConversation: (draft?: string) => void;
  on: (event: "unread", listener: (count: number) => void) => () => void;
}

interface Window {
  Helpwren?: HelpwrenWidget;
}

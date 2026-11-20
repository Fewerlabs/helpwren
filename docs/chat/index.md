# The script tag

Add the chat to any website with one script from your install.

With no options, `init` adds a launcher in the corner that opens the chat, styled as **Settings →
Branding** says. On a phone the chat takes the whole screen.

```html title="index.html"
<script src="https://support.example.com/widget.js"></script>
<script>
  Helpwren.init({ source: "web" });
</script>
```

**Settings → Installation** writes this snippet for you, with your address in it, and a live
check turns green as soon as the widget loads on a real site. Every install serves its own copy
of the script, so a site needs nothing from npm.

## React

Render this component once, near the root of your app:

```jsx title="helpwren-chat.jsx"
import { useEffect } from "react";

export function HelpwrenChat() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://support.example.com/widget.js";
    script.async = true;
    script.onload = () => window.Helpwren.init({ source: "web" });
    document.body.append(script);

    return () => {
      window.Helpwren?.destroy();
      script.remove();
    };
  }, []);

  return null;
}
```

## Next.js

Render this component once, in your root layout:

```jsx title="app/helpwren-chat.jsx"
"use client";

import Script from "next/script";

export function HelpwrenChat() {
  return (
    <Script
      src="https://support.example.com/widget.js"
      onLoad={() => window.Helpwren.init({ source: "web" })}
    />
  );
}
```

An app that bundles its own code can use the [`helpwren`](../packages/helpwren.md) package
instead. It behaves the same and has the same types.

## Next steps

- [Options](options.md) for `init`: where it sits, what opens it, its size.
- [Methods](methods.md) and [events](events.md), to open it from your code and show an unread
  count.
- [The chat inside your own page](inline.md), or [your own button](own-button.md).
- [Appearance](appearance.md): your brand, and a look per page.
- [Know your users](../users/index.md), for people who are logged in.

## What a page cannot do

The page around the chat never sees a visitor's messages, and it cannot send one for them. Text
passed to `startConversation` is only a draft in the message box.

> [!NOTE]
> Once you list any [allowed domains](../security/allowed-domains.md), only those sites can show
> the chat.
